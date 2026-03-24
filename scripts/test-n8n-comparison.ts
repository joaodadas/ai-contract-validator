import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { extractText } from "unpdf";
import { buildAgentInput } from "../src/ai/orchestrator/agentDocumentMapper";
import { runAtoAgent } from "../src/ai/agents/ato-agent/agent";
import { runCarteiraTrabalhoAgent } from "../src/ai/agents/carteira-trabalho-agent/agent";
import { runCertidaoEstadoCivilAgent } from "../src/ai/agents/certidao-estado-civil-agent/agent";
import { runComprovanteRendaAgent } from "../src/ai/agents/comprovante-renda-agent/agent";
import { runComprovanteResidenciaAgent } from "../src/ai/agents/comprovante-residencia-agent/agent";
import { runFluxoAgent } from "../src/ai/agents/fluxo-agent/agent";
import { runPlantaAgent } from "../src/ai/agents/planta-agent/agent";
import { runQuadroResumoAgent } from "../src/ai/agents/quadro-resumo-agent/agent";
import { runRgcpfAgent } from "../src/ai/agents/rgcpf-agent/agent";
import { runTermoAgent } from "../src/ai/agents/termo-agent/agent";
import type { DocumentContent } from "../src/lib/cvcrm/documentDownloader";

const FIXTURES_DIR = path.join(__dirname, "..", "test-fixtures");

// All 10 documents from N8N execution 822336 (reservation 22671)
const N8N_DOCS = [
  {
    url: "https://lyxengenharia.cvcrm.com.br/api/get/download/temp/reservas_documentos/2026/03/22671/20260318202007_69bb3327744dd.pdf",
    filename: "rg-alaercio.pdf",
    nome: "Alaercio — RG.pdf",
    tipo: "RG Principal",
    agent: "rgcpf-agent" as const,
    runner: runRgcpfAgent,
  },
  {
    url: "https://lyxengenharia.cvcrm.com.br/api/get/download/temp/reservas_documentos/2026/03/22671/20260318202019_69bb3333bd5db.pdf",
    filename: "residencia-alaercio.pdf",
    nome: "Alaercio — RESIDENCIA.pdf",
    tipo: "Comprovante de Residëncia",
    agent: "comprovante-residencia-agent" as const,
    runner: runComprovanteResidenciaAgent,
  },
  {
    url: "https://lyxengenharia.cvcrm.com.br/api/get/download/temp/reservas_documentos/2026/03/22671/20260318202034_69bb33422d940.pdf",
    filename: "inss-alaercio.pdf",
    nome: "Alaercio — INSS.pdf",
    tipo: "Comprovante de Renda",
    agent: "comprovante-renda-agent" as const,
    runner: runComprovanteRendaAgent,
  },
  {
    url: "https://lyxengenharia.cvcrm.com.br/api/get/download/temp/reservas_documentos/2026/03/22671/20260318202110_69bb3366a9945.pdf",
    filename: "ctps-alaercio.pdf",
    nome: "Alaercio — CTPS.pdf",
    tipo: "Carteira de Trabalho",
    agent: "carteira-trabalho-agent" as const,
    runner: runCarteiraTrabalhoAgent,
  },
  {
    url: "https://lyxengenharia.cvcrm.com.br/api/get/download/temp/reservas_documentos/2026/03/22671/20260318211528_69bb4020130b2.pdf",
    filename: "fluxo-alaercio.pdf",
    nome: "Fluxo - ALAERCIO GUAREZI-18-03-2026.pdf",
    tipo: "Fluxo",
    agent: "fluxo-agent" as const,
    runner: runFluxoAgent,
  },
  {
    url: "https://lyxengenharia.cvcrm.com.br/api/get/download/temp/reservas_documentos/2026/03/22671/20260320094156_69bd409483bd8.pdf",
    filename: "termo-ciencia.pdf",
    nome: "termo de ciencia.pdf",
    tipo: "Termo de ciência",
    agent: "termo-agent" as const,
    runner: runTermoAgent,
  },
  {
    url: "https://lyxengenharia.cvcrm.com.br/api/get/download/temp/reservas_documentos/2026/03/22671/20260324104150_69c2949e4cd53.jpeg",
    filename: "certidao-alaercio.jpeg",
    nome: "CERTIDAO ALAERCIO.jpeg",
    tipo: "Certidão de Estado Civil",
    agent: "certidao-estado-civil-agent" as const,
    runner: runCertidaoEstadoCivilAgent,
  },
  {
    url: "https://lyxengenharia.cvcrm.com.br/api/get/download/temp/reservas_documentos/2026/03/22671/20260324104645_69c295c5f2810.jpeg",
    filename: "ato-alaercio.jpeg",
    nome: "ATO ALAERCIO.jpeg",
    tipo: "Ato",
    agent: "ato-agent" as const,
    runner: runAtoAgent,
  },
  {
    url: "https://lyxengenharia.cvcrm.com.br/api/get/download/temp/reservas_contratos/2026/03/22671/reserva_contrato_171485.pdf",
    filename: "quadro-resumo-22671.pdf",
    nome: "Quadro Resumo v.2.0.pdf",
    tipo: "Quadro Resumo",
    agent: "quadro-resumo-agent" as const,
    runner: runQuadroResumoAgent,
  },
  {
    url: "https://lyxengenharia.cvcrm.com.br/api/get/download/temp/reservas_contratos/2026/03/22671/reserva_contrato_171481.pdf",
    filename: "planta-22671.pdf",
    nome: "Planta.pdf",
    tipo: "Planta",
    agent: "planta-agent" as const,
    runner: runPlantaAgent,
  },
];

const CONTEXT_JSON = JSON.stringify({
  reservaId: 22671,
  planta: {
    empreendimento: "LOUISVILLE - CONDOMINIO RESIDENCIAL",
    bloco: "BLOCO 07",
    numero: "AP 108",
    andar: 1,
  },
  pessoas: {
    titular: {
      nome: "ALAERCIO GUAREZI",
      documento: "72701960959",
      documento_tipo: "cpf",
      rg: "48349323",
      estado_civil: "solteiro",
      nascimento: "1966-03-06",
      email: "",
      telefone: "",
      celular: "",
    },
  },
}, null, 2);

async function downloadDoc(url: string, filename: string): Promise<Buffer> {
  const filepath = path.join(FIXTURES_DIR, filename);
  if (fs.existsSync(filepath)) {
    console.log(`  [cache] ${filename}`);
    return fs.readFileSync(filepath);
  }
  console.log(`  [download] ${filename}`);
  const res = await fetch(url, { headers: { Accept: "*/*" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText} for ${url}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  fs.writeFileSync(filepath, buffer);
  console.log(`    saved ${buffer.length} bytes`);
  return buffer;
}

function getMimeType(filename: string): string {
  if (filename.endsWith(".jpeg") || filename.endsWith(".jpg")) return "image/jpeg";
  if (filename.endsWith(".png")) return "image/png";
  return "application/pdf";
}

async function extractContent(buffer: Buffer, filename: string, nome: string, tipo: string): Promise<DocumentContent> {
  const mime = getMimeType(filename);

  if (mime.startsWith("image/")) {
    return {
      documentId: 0, nome, tipo,
      contentType: "image",
      imageData: buffer,
      imageMimeType: mime,
      link: "",
    };
  }

  // PDF: try text extraction
  try {
    const { text } = await extractText(new Uint8Array(buffer));
    const joined = Array.isArray(text) ? text.join("\n") : String(text ?? "");
    const trimmed = joined.trim();
    if (trimmed.length > 10) {
      return {
        documentId: 0, nome, tipo,
        contentType: "text",
        text: trimmed,
        link: "",
      };
    }
  } catch {
    // fall through
  }

  // Scanned PDF
  return {
    documentId: 0, nome, tipo,
    contentType: "image",
    imageData: buffer,
    imageMimeType: "application/pdf",
    link: "",
  };
}

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("  TESTE COMPLETO: 10 docs da execução N8N 822336 (reserva 22671)");
  console.log("  Modelo: gemini-2.5-pro (mesmo que N8N)");
  console.log("=".repeat(70));

  // Step 1: Download all
  console.log("\n[1/3] Baixando todos os documentos...\n");
  const downloaded: { doc: typeof N8N_DOCS[0]; buffer: Buffer }[] = [];
  for (const doc of N8N_DOCS) {
    const buffer = await downloadDoc(doc.url, doc.filename);
    downloaded.push({ doc, buffer });
  }

  // Step 2: Extract content
  console.log("\n[2/3] Extraindo conteúdo...\n");
  const contents: { doc: typeof N8N_DOCS[0]; content: DocumentContent }[] = [];
  for (const { doc, buffer } of downloaded) {
    const content = await extractContent(buffer, doc.filename, doc.nome, doc.tipo);
    const label = content.contentType === "text"
      ? `TEXT (${content.text?.length} chars)`
      : `${content.imageMimeType === "application/pdf" ? "SCANNED PDF" : "IMAGE"} (${buffer.length} bytes)`;
    console.log(`  ${doc.tipo.padEnd(30)} → ${label}`);
    contents.push({ doc, content });
  }

  // Step 3: Run each agent
  console.log("\n[3/3] Rodando agentes (gemini-2.5-pro)...\n");
  const results: Record<string, unknown> = {};
  const errors: string[] = [];

  for (const { doc, content } of contents) {
    console.log(`${"─".repeat(60)}`);
    console.log(`  Agent: ${doc.agent}`);
    console.log(`  Doc:   ${doc.nome} (${doc.tipo})`);

    const input = buildAgentInput([content], CONTEXT_JSON);
    console.log(`  Input: text=${input.text.length} chars, files=${input.files?.length ?? 0}, images=${input.images?.length ?? 0}`);

    try {
      const result = await doc.runner(input, {
        modelKey: "google_pro",
        maxTokens: 8192,
      });

      if (result.ok) {
        console.log(`  Result: OK (${result.attempts} attempts, ${result.model})`);
        results[doc.agent] = result.data;
      } else {
        console.log(`  Result: FAILED`);
        console.log(`  Error: ${result.error}`);
        if (result.raw) console.log(`  Raw (first 300): ${result.raw.substring(0, 300)}`);
        errors.push(`${doc.agent}: ${result.error}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  EXCEPTION: ${msg}`);
      errors.push(`${doc.agent}: EXCEPTION - ${msg}`);
    }
    console.log("");
  }

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log("  RESULTADOS COMPLETOS");
  console.log("=".repeat(70));
  console.log(JSON.stringify(results, null, 2));

  if (errors.length > 0) {
    console.log("\n  ERROS:");
    errors.forEach(e => console.log(`  - ${e}`));
  }

  // Save to file for comparison
  const outputPath = path.join(FIXTURES_DIR, "extraction-results-22671.json");
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n  Resultados salvos em: ${outputPath}`);

  console.log("\n" + "=".repeat(70));
  console.log(`  ${Object.keys(results).length}/${N8N_DOCS.length} agentes OK, ${errors.length} erros`);
  console.log("=".repeat(70) + "\n");
}

main().catch(console.error);
