import "dotenv/config";
import { fetchReserva, fetchContratos, fetchDocumentos } from "../src/lib/cvcrm/client";
import { filterDocuments } from "../src/lib/cvcrm/constants";
import { downloadAllDocuments } from "../src/lib/cvcrm/documentDownloader";
import { mapDocumentsToAgents } from "../src/ai/orchestrator/agentDocumentMapper";
import { analyzeContract } from "../src/ai/orchestrator/contractOrchestrator";
import type { CvcrmDocumentoItem } from "../src/lib/cvcrm/types";

const TEST_RESERVA_ID = Number(process.argv[2]) || 22671;

async function main() {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`  TESTE PIPELINE COMPLETO — Reserva ${TEST_RESERVA_ID}`);
  console.log(`${"=".repeat(70)}\n`);

  // ─── Step 1: Fetch reservation ───
  console.log("[1/6] Buscando dados da reserva no CVCRM...");
  const apiResponse = await fetchReserva(TEST_RESERVA_ID);
  const reserva = Object.values(apiResponse)[0];
  if (!reserva) {
    console.error("❌ Reserva não encontrada!");
    process.exit(1);
  }
  console.log(`  Titular: ${reserva.titular.nome}`);
  console.log(`  Empreendimento: ${reserva.unidade.empreendimento}`);
  console.log(`  Unidade: ${reserva.unidade.bloco} - ${reserva.unidade.unidade}`);

  // ─── Step 2: Fetch docs & contracts ───
  console.log("\n[2/6] Buscando documentos e contratos...");
  const [contratos, docsResponse] = await Promise.all([
    fetchContratos(TEST_RESERVA_ID),
    fetchDocumentos(TEST_RESERVA_ID),
  ]);
  const documentosRaw = docsResponse.dados?.documentos ?? {};
  const documentos = filterDocuments(documentosRaw) as Record<string, CvcrmDocumentoItem[]>;

  const rawCount = Object.values(documentosRaw).flat().length;
  const filteredCount = Object.values(documentos).flat().length;
  console.log(`  Contratos: ${contratos.length}`);
  console.log(`  Documentos: ${rawCount} total → ${filteredCount} filtrados`);

  // ─── Step 3: Download ───
  console.log("\n[3/6] Baixando documentos...");
  const downloadedDocs = await downloadAllDocuments(documentos, contratos);

  for (const doc of downloadedDocs) {
    if (doc.error) {
      console.log(`  ❌ ${doc.nome} (${doc.tipo}): ${doc.error}`);
    } else if (doc.contentType === "text") {
      console.log(`  📄 ${doc.nome} (${doc.tipo}): ${doc.text?.length ?? 0} chars`);
    } else {
      console.log(`  🖼️  ${doc.nome} (${doc.tipo}): ${doc.imageData?.length ?? 0} bytes [${doc.imageMimeType}]`);
    }
  }

  // ─── Step 4: Map to agents ───
  console.log("\n[4/6] Mapeando documentos para agentes...");
  const documentMap = mapDocumentsToAgents(downloadedDocs);
  for (const [agent, docs] of documentMap.entries()) {
    console.log(`  ${agent}: ${docs.map(d => d.nome).join(", ")}`);
  }

  // ─── Step 5: Run FULL pipeline ───
  console.log("\n[5/6] Rodando pipeline completo (extração + validação)...\n");

  const reservaPlanta = {
    bloco: reserva.unidade.bloco,
    numero: reserva.unidade.unidade,
  };

  const contextJson = JSON.stringify({
    reservaId: TEST_RESERVA_ID,
    situacao: reserva.situacao,
    planta: {
      empreendimento: reserva.unidade.empreendimento,
      bloco: reserva.unidade.bloco,
      numero: reserva.unidade.unidade,
    },
    pessoas: {
      titular: reserva.titular,
      associados: reserva.associados,
    },
  }, null, 2);

  const startTime = Date.now();
  const analysis = await analyzeContract(
    documentMap,
    contextJson,
    undefined,
    undefined,
    reservaPlanta,
  );
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // ─── Step 6: Show results ───
  console.log(`\n${"=".repeat(70)}`);
  console.log(`  RESULTADOS (${elapsed}s)`);
  console.log(`${"=".repeat(70)}\n`);

  // Per-agent extraction results
  console.log("── EXTRAÇÃO POR AGENTE ──\n");
  for (const result of analysis.results) {
    const status = result.ok ? "✅" : "❌";
    const provider = result.ok ? ` [${result.provider}/${result.model}]` : "";
    console.log(`${status} ${result.agent}${provider}`);

    if (result.ok && result.data) {
      console.log(JSON.stringify(result.data, null, 2));
    } else if (result.error) {
      console.log(`   Erro: ${result.error}`);
    }
    console.log("");
  }

  // Financial comparison
  console.log("── COMPARAÇÃO FINANCEIRA ──\n");
  if (analysis.financialComparison) {
    console.log(`Status: ${analysis.financialComparison.status_geral}`);
    console.log(JSON.stringify(analysis.financialComparison, null, 2));
  } else {
    console.log("⚠️ Não foi possível comparar (Fluxo ou Quadro ausente)");
  }

  // Planta validation
  console.log("\n── VALIDAÇÃO PLANTA ──\n");
  if (analysis.plantaValidation) {
    console.log(`Status: ${analysis.plantaValidation.status}`);
    console.log(`Mensagem: ${analysis.plantaValidation.mensagem}`);
    console.log(JSON.stringify(analysis.plantaValidation.dadosComparados, null, 2));
  } else {
    console.log("⚠️ Sem validação de planta");
  }

  // Cross-validation
  console.log("\n── CROSS-VALIDATION (AI Agent) ──\n");
  if (analysis.validation) {
    console.log(JSON.stringify(analysis.validation, null, 2));
  } else {
    console.log("⚠️ Cross-validation não executada");
  }

  // Final report
  console.log("\n── RELATÓRIO FINAL ──\n");
  console.log(analysis.formattedReport ?? "Sem relatório");

  // Summary
  console.log(`\n${"=".repeat(70)}`);
  console.log(`  RESUMO`);
  console.log(`${"=".repeat(70)}`);
  console.log(`  Pipeline OK: ${analysis.ok}`);
  console.log(`  Agentes com falha: ${analysis.summary.failed_agents.join(", ") || "nenhum"}`);
  console.log(`  Fluxo valor total: ${analysis.summary.totals.fluxo_valor_total ?? "N/A"}`);
  console.log(`  Ato valor total: ${analysis.summary.totals.ato_valor_total ?? "N/A"}`);
  console.log(`  Tempo total: ${elapsed}s`);
  console.log(`${"=".repeat(70)}\n`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
