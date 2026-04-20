/**
 * Benchmark runner — compares AI model performance across fixture reservations.
 *
 * Usage:
 *   npx tsx scripts/run-benchmark.ts [--fixtures <path>] [--models <keys>] [--concurrency <n>]
 *
 * Examples:
 *   npx tsx scripts/run-benchmark.ts
 *   npx tsx scripts/run-benchmark.ts --models google_pro,google_flash_25
 *   npx tsx scripts/run-benchmark.ts --fixtures backtest/fixtures/ --concurrency 2
 */
import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import type { ModelKey, AgentResult, TokenUsage } from "@/ai/_base/types";
import { calculateCost } from "@/ai/benchmark/pricing";
import { compareFields, type FieldComparison } from "@/ai/benchmark/comparator";
import {
  runExtraction,
  runCrossValidation,
  runFinancialComparison,
  runPlantaValidation,
} from "@/ai/orchestrator/contractOrchestrator";
import { mapDocumentsToAgents } from "@/ai/orchestrator/agentDocumentMapper";
import type { DocumentContent } from "@/lib/cvcrm/documentDownloader";
import type { ReservaProcessada } from "@/lib/cvcrm/types";

// ─── CLI argument parsing ───────────────────────────────────────────────────

const ALL_MODEL_KEYS: ModelKey[] = [
  "google_pro",
  "google_flash_25",
  "google_flash_lite_31",
  "google_flash",
  "xai_grok3",
  "xai_grok3_mini",
  "xai_grok3_mini_nr",
];

function parseArgs(): {
  fixturesDir: string;
  modelKeys: ModelKey[];
  concurrency: number;
} {
  const args = process.argv.slice(2);
  let fixturesDir = "backtest/fixtures";
  let modelKeys: ModelKey[] = ALL_MODEL_KEYS;
  let concurrency = 1;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--fixtures" && args[i + 1]) {
      fixturesDir = args[++i];
    } else if (args[i] === "--models" && args[i + 1]) {
      modelKeys = args[++i].split(",").map((k) => k.trim() as ModelKey);
    } else if (args[i] === "--concurrency" && args[i + 1]) {
      concurrency = parseInt(args[++i], 10);
    }
  }

  return { fixturesDir: path.resolve(process.cwd(), fixturesDir), modelKeys, concurrency };
}

// ─── Types ──────────────────────────────────────────────────────────────────

type FixtureManifestEntry = {
  externalId: string;
  enterprise: string;
  status: string;
  documentCount: number;
};

type FixtureManifest = {
  exportedAt: string;
  fixtures: FixtureManifestEntry[];
};

type GroundTruth = {
  results?: Array<{ agent: string; data: Record<string, unknown> }>;
  [key: string]: unknown;
};

type ModelRunResult = {
  modelKey: ModelKey;
  externalId: string;
  success: boolean;
  error?: string;
  durationMs: number;
  usage: TokenUsage;
  cost: number;
  agentResults: AgentResult<unknown>[];
  comparisons: FieldComparison[];
};

// ─── Document loading from disk ─────────────────────────────────────────────

type SnapshotDocumentEntry = {
  id?: number;
  idreservasdocumentos?: number;
  nome: string;
  tipo: string;
  link?: string;
  pessoa?: string;
};

function detectMimeType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".bmp")) return "image/bmp";
  if (lower.endsWith(".tiff") || lower.endsWith(".tif")) return "image/tiff";
  return "image/jpeg";
}

function loadDocumentsFromFixture(
  fixtureDir: string,
  snapshot: ReservaProcessada,
): DocumentContent[] {
  const docsDir = path.join(fixtureDir, "documents");
  if (!fs.existsSync(docsDir)) return [];

  const files = fs.readdirSync(docsDir).filter((f) => !f.startsWith("."));

  // Flatten all documents from the snapshot's documentos map
  const snapshotDocs: SnapshotDocumentEntry[] = [];
  if (snapshot.documentos) {
    // documentos is a Record<string, CvcrmDocumentoItem[]> keyed by person group
    for (const [pessoa, docs] of Object.entries(snapshot.documentos)) {
      if (Array.isArray(docs)) {
        for (const doc of docs) {
          snapshotDocs.push({ ...doc, pessoa });
        }
      }
    }
  }
  // Also include contracts
  if (snapshot.contratos) {
    for (const contrato of snapshot.contratos) {
      snapshotDocs.push({
        nome: contrato.contrato,
        tipo: contrato.tipo ?? "contrato",
        link: contrato.link,
      });
    }
  }

  const contents: DocumentContent[] = [];

  for (const filename of files) {
    const filePath = path.join(docsDir, filename);
    const buffer = fs.readFileSync(filePath);
    const mimeType = detectMimeType(filename);
    const isPdf = mimeType === "application/pdf";
    const isImage = mimeType.startsWith("image/") && mimeType !== "application/pdf";

    // Try to match this file to a snapshot document by name similarity
    const filenameLower = filename.toLowerCase();
    const matched = snapshotDocs.find((doc) => {
      if (!doc.nome) return false;
      const safeName = doc.nome
        .replace(/[^a-zA-Z0-9-_]/g, "_")
        .substring(0, 50)
        .toLowerCase();
      return filenameLower.includes(safeName) || safeName.includes(filenameLower.replace(/\.\w+$/, "").slice(3));
    });

    const docId = matched?.id ?? matched?.idreservasdocumentos ?? 0;
    const nome = matched?.nome ?? filename;
    const tipo = matched?.tipo ?? (isPdf ? "pdf" : "imagem");
    const link = matched?.link ?? filename;
    const pessoa = matched?.pessoa;

    if (isPdf) {
      contents.push({
        documentId: docId,
        nome,
        tipo,
        contentType: "text",
        imageData: buffer,
        imageMimeType: "application/pdf",
        link,
        pessoa,
      });
    } else if (isImage) {
      contents.push({
        documentId: docId,
        nome,
        tipo,
        contentType: "image",
        imageData: buffer,
        imageMimeType: mimeType,
        link,
        pessoa,
      });
    }
  }

  return contents;
}

// ─── Token accumulation ─────────────────────────────────────────────────────

function sumUsage(results: AgentResult<unknown>[]): TokenUsage {
  let promptTokens = 0;
  let completionTokens = 0;
  for (const r of results) {
    if (r.usage) {
      promptTokens += r.usage.promptTokens;
      completionTokens += r.usage.completionTokens;
    }
  }
  return { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens };
}

// ─── Ground-truth comparison ─────────────────────────────────────────────────

function flattenAgentData(results: AgentResult<unknown>[]): Record<string, unknown> {
  const flat: Record<string, unknown> = {};
  for (const r of results) {
    if (!r.ok || !r.data) continue;
    const prefix = r.pessoa ? `${r.agent}:${r.pessoa}` : r.agent;
    if (typeof r.data === "object" && r.data !== null) {
      for (const [k, v] of Object.entries(r.data as Record<string, unknown>)) {
        flat[`${prefix}.${k}`] = v;
      }
    }
  }
  return flat;
}

function flattenGroundTruth(gt: GroundTruth): Record<string, unknown> {
  const flat: Record<string, unknown> = {};
  if (!gt.results) return flat;
  for (const entry of gt.results) {
    const prefix = entry.agent;
    for (const [k, v] of Object.entries(entry.data)) {
      flat[`${prefix}.${k}`] = v;
    }
  }
  return flat;
}

// ─── Run a single fixture × model ────────────────────────────────────────────

async function runSingle(
  fixtureDir: string,
  snapshot: ReservaProcessada,
  groundTruth: GroundTruth | null,
  modelKey: ModelKey,
): Promise<ModelRunResult> {
  const externalId = path.basename(fixtureDir);
  const start = Date.now();

  try {
    const documents = loadDocumentsFromFixture(fixtureDir, snapshot);
    const documentMap = mapDocumentsToAgents(documents);

    const contextJson = JSON.stringify(
      {
        reservaId: snapshot.reservaId,
        situacao: snapshot.situacao,
        planta: snapshot.planta,
        pessoas: snapshot.pessoas,
      },
      null,
      2,
    );

    const options = { modelKey };

    // Phase 1: Extraction
    const extractionResults = await runExtraction(documentMap, contextJson, options);

    // Phase 2 & 3: Deterministic (no model-specific runs needed)
    const financialComparison = runFinancialComparison(extractionResults);
    const reservaPlanta = snapshot.planta
      ? { bloco: snapshot.planta.bloco, numero: snapshot.planta.numero }
      : undefined;
    const plantaValidation = runPlantaValidation(extractionResults, reservaPlanta);

    // Phase 4: Cross-validation
    let crossValidationResult;
    try {
      crossValidationResult = await runCrossValidation(
        extractionResults,
        financialComparison,
        plantaValidation,
        options,
      );
    } catch {
      crossValidationResult = undefined;
    }

    const allResults: AgentResult<unknown>[] = crossValidationResult
      ? [...extractionResults, crossValidationResult as AgentResult<unknown>]
      : extractionResults;

    const usage = sumUsage(allResults);
    const cost = calculateCost(modelKey, usage.promptTokens, usage.completionTokens);

    // Compare with ground truth
    let comparisons: FieldComparison[] = [];
    if (groundTruth) {
      const expected = flattenGroundTruth(groundTruth);
      const actual = flattenAgentData(allResults);
      comparisons = compareFields(expected, actual);
    }

    return {
      modelKey,
      externalId,
      success: allResults.some((r) => r.ok),
      durationMs: Date.now() - start,
      usage,
      cost,
      agentResults: allResults,
      comparisons,
    };
  } catch (err) {
    return {
      modelKey,
      externalId,
      success: false,
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - start,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      cost: 0,
      agentResults: [],
      comparisons: [],
    };
  }
}

// ─── Concurrency pool ─────────────────────────────────────────────────────────

async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number,
): Promise<T[]> {
  const results: T[] = [];
  const queue = [...tasks];

  async function worker() {
    while (queue.length > 0) {
      const task = queue.shift();
      if (task) {
        results.push(await task());
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// ─── Report printing ─────────────────────────────────────────────────────────

function formatNumber(n: number, decimals = 1): string {
  return n.toFixed(decimals);
}

function pad(s: string, width: number): string {
  return s.padEnd(width);
}

function printReport(
  results: ModelRunResult[],
  fixtureCount: number,
  modelKeys: ModelKey[],
): void {
  console.log("\n" + "═".repeat(70));
  console.log(`  MODEL BENCHMARK — ${fixtureCount} reserva(s) × ${modelKeys.length} modelo(s)`);
  console.log("═".repeat(70) + "\n");

  // Aggregate per model
  type ModelStats = {
    totalRuns: number;
    successRuns: number;
    matchFields: number;
    totalFields: number;
    totalTokens: number;
    totalCost: number;
    totalTimeMs: number;
    mismatches: Record<string, number>; // field → count of mismatches
  };

  const statsMap = new Map<ModelKey, ModelStats>();
  for (const mk of modelKeys) {
    statsMap.set(mk, {
      totalRuns: 0,
      successRuns: 0,
      matchFields: 0,
      totalFields: 0,
      totalTokens: 0,
      totalCost: 0,
      totalTimeMs: 0,
      mismatches: {},
    });
  }

  for (const r of results) {
    const stats = statsMap.get(r.modelKey);
    if (!stats) continue;
    stats.totalRuns++;
    if (r.success) stats.successRuns++;
    stats.totalTokens += r.usage.totalTokens;
    stats.totalCost += r.cost;
    stats.totalTimeMs += r.durationMs;

    for (const cmp of r.comparisons) {
      stats.totalFields++;
      if (cmp.status === "match") {
        stats.matchFields++;
      } else {
        stats.mismatches[cmp.field] = (stats.mismatches[cmp.field] ?? 0) + 1;
      }
    }
  }

  // Table header
  const COL = { model: 22, success: 10, match: 10, tokens: 13, cost: 10, time: 10 };
  const header = [
    pad("Modelo", COL.model),
    pad("Sucesso", COL.success),
    pad("Match %", COL.match),
    pad("Tokens", COL.tokens),
    pad("Custo", COL.cost),
    "Tempo",
  ].join("  ");
  console.log(header);
  console.log("─".repeat(70));

  let bestCostModel: ModelKey | null = null;
  let bestCost = Infinity;
  let bestQualityModel: ModelKey | null = null;
  let bestQuality = -1;

  for (const mk of modelKeys) {
    const s = statsMap.get(mk)!;
    const successPct = s.totalRuns > 0 ? (s.successRuns / s.totalRuns) * 100 : 0;
    const matchPct = s.totalFields > 0 ? (s.matchFields / s.totalFields) * 100 : 0;
    const tokensK = s.totalTokens / 1000;
    const avgTimeS = s.totalRuns > 0 ? s.totalTimeMs / s.totalRuns / 1000 : 0;

    const row = [
      pad(mk, COL.model),
      pad(`${formatNumber(successPct, 1)}%`, COL.success),
      pad(s.totalFields > 0 ? `${formatNumber(matchPct, 1)}%` : "n/a", COL.match),
      pad(`${formatNumber(tokensK, 1)}k`, COL.tokens),
      pad(`$${formatNumber(s.totalCost, 4)}`, COL.cost),
      `${formatNumber(avgTimeS, 1)}s`,
    ].join("  ");
    console.log(row);

    if (s.totalCost < bestCost && s.totalCost > 0) {
      bestCost = s.totalCost;
      bestCostModel = mk;
    }
    if (matchPct > bestQuality) {
      bestQuality = matchPct;
      bestQualityModel = mk;
    }
  }

  // Per-reserva cost summary
  console.log("\nCUSTO POR RESERVA (total):");
  if (bestCostModel) {
    const s = statsMap.get(bestCostModel)!;
    console.log(`  Menor custo:        ${bestCostModel} ($${formatNumber(s.totalCost, 4)} total)`);
  }
  if (bestQualityModel) {
    const s = statsMap.get(bestQualityModel)!;
    console.log(`  Melhor qualidade:   ${bestQualityModel} (${formatNumber(bestQuality, 1)}% match)`);
  }

  // Divergences vs ground truth
  console.log("\nDIVERGÊNCIAS vs GROUND TRUTH:");
  let anyDivergence = false;
  for (const mk of modelKeys) {
    const s = statsMap.get(mk)!;
    const divergentFields = Object.entries(s.mismatches)
      .filter(([, count]) => count > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    if (divergentFields.length > 0) {
      anyDivergence = true;
      for (const [field, count] of divergentFields) {
        console.log(`  ${mk}: campo "${field}" divergiu em ${count}/${fixtureCount} reserva(s)`);
      }
    }
  }
  if (!anyDivergence) {
    console.log("  (sem divergências registradas)");
  }

  console.log("");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { fixturesDir, modelKeys, concurrency } = parseArgs();

  // Load manifest
  const manifestPath = path.join(fixturesDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    console.error(`Manifest not found: ${manifestPath}`);
    console.error("Run `npm run benchmark:export` first to create fixtures.");
    process.exit(1);
  }

  const manifest: FixtureManifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  const { fixtures } = manifest;

  if (fixtures.length === 0) {
    console.error("No fixtures found in manifest.");
    process.exit(1);
  }

  console.log(`Loaded ${fixtures.length} fixture(s) from ${fixturesDir}`);
  console.log(`Models: ${modelKeys.join(", ")}`);
  console.log(`Concurrency: ${concurrency}`);
  console.log(`Total runs: ${fixtures.length * modelKeys.length}\n`);

  // Build all tasks
  const tasks: (() => Promise<ModelRunResult>)[] = [];

  for (const fixture of fixtures) {
    const fixtureDir = path.join(fixturesDir, fixture.externalId);

    const reservationPath = path.join(fixtureDir, "reservation.json");
    if (!fs.existsSync(reservationPath)) {
      console.warn(`Skipping ${fixture.externalId}: reservation.json not found`);
      continue;
    }

    const snapshot: ReservaProcessada = JSON.parse(
      fs.readFileSync(reservationPath, "utf-8"),
    );

    const groundTruthPath = path.join(fixtureDir, "ground-truth.json");
    const groundTruth: GroundTruth | null = fs.existsSync(groundTruthPath)
      ? (JSON.parse(fs.readFileSync(groundTruthPath, "utf-8")) as GroundTruth)
      : null;

    for (const modelKey of modelKeys) {
      tasks.push(() => {
        console.log(`[run] ${fixture.externalId} × ${modelKey}`);
        return runSingle(fixtureDir, snapshot, groundTruth, modelKey);
      });
    }
  }

  // Execute with concurrency
  const allResults = await runWithConcurrency(tasks, concurrency);

  // Print report
  printReport(allResults, fixtures.length, modelKeys);

  // Save raw results
  const resultsDir = path.resolve(process.cwd(), "backtest/results");
  fs.mkdirSync(resultsDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = path.join(resultsDir, `${timestamp}.json`);
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        runAt: new Date().toISOString(),
        fixtureCount: fixtures.length,
        modelKeys,
        concurrency,
        results: allResults.map((r) => ({
          ...r,
          // Omit large binary data from agentResults
          agentResults: r.agentResults.map((ar) => ({
            agent: ar.agent,
            ok: ar.ok,
            error: ar.error,
            attempts: ar.attempts,
            provider: ar.provider,
            model: ar.model,
            usage: ar.usage,
            pessoa: ar.pessoa,
          })),
        })),
      },
      null,
      2,
    ),
  );
  console.log(`Raw results saved to: ${outPath}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});
