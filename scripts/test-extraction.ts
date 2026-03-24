import "dotenv/config";
import { fetchReserva, fetchContratos, fetchDocumentos } from "../src/lib/cvcrm/client";
import { filterDocuments } from "../src/lib/cvcrm/constants";
import { downloadAllDocuments, type DocumentContent } from "../src/lib/cvcrm/documentDownloader";
import { mapDocumentsToAgents, buildAgentInput } from "../src/ai/orchestrator/agentDocumentMapper";
import { runCnhAgent } from "../src/ai/agents/cnh-agent/agent";
import { runRgcpfAgent } from "../src/ai/agents/rgcpf-agent/agent";
import { runQuadroResumoAgent } from "../src/ai/agents/quadro-resumo-agent/agent";
import type { CvcrmDocumentoItem } from "../src/lib/cvcrm/types";
import type { AgentName } from "../src/ai/_base/types";

// Use a real reservation ID — adjust as needed
const TEST_RESERVA_ID = Number(process.argv[2]);

if (!TEST_RESERVA_ID) {
  console.error("Usage: npx tsx scripts/test-extraction.ts <idReserva>");
  process.exit(1);
}

async function main() {
  console.log(`\n=== TESTE DE EXTRAÇÃO — Reserva ${TEST_RESERVA_ID} ===\n`);

  // Step 1: Fetch reservation data from CVCRM
  console.log("[1] Buscando dados da reserva no CVCRM...");
  const apiResponse = await fetchReserva(TEST_RESERVA_ID);
  const reserva = Object.values(apiResponse)[0];
  if (!reserva) {
    console.error("Reserva não encontrada!");
    process.exit(1);
  }
  console.log(`    Titular: ${reserva.titular.nome}`);
  console.log(`    Empreendimento: ${reserva.unidade.empreendimento}`);
  console.log(`    Unidade: ${reserva.unidade.bloco} - ${reserva.unidade.unidade}`);

  // Step 2: Fetch documents and contracts
  console.log("\n[2] Buscando documentos e contratos...");
  const [contratos, docsResponse] = await Promise.all([
    fetchContratos(TEST_RESERVA_ID),
    fetchDocumentos(TEST_RESERVA_ID),
  ]);

  const documentosRaw = docsResponse.dados?.documentos ?? {};
  const documentos = filterDocuments(documentosRaw) as Record<string, CvcrmDocumentoItem[]>;

  console.log(`    Contratos: ${contratos.length}`);
  console.log(`    Grupos de documentos (filtrados): ${Object.keys(documentos).length}`);
  for (const [grupo, docs] of Object.entries(documentos)) {
    console.log(`      ${grupo}: ${docs.length} doc(s) — tipos: ${docs.map(d => d.tipo).join(", ")}`);
  }

  const docsRawCount = Object.values(documentosRaw).flat().length;
  const docsFilteredCount = Object.values(documentos).flat().length;
  console.log(`    Filtro: ${docsRawCount} → ${docsFilteredCount} documentos (removidos ${docsRawCount - docsFilteredCount} com tipo não aceito)`);

  // Step 3: Download documents
  console.log("\n[3] Baixando documentos (download real dos arquivos)...");
  const downloadedDocs = await downloadAllDocuments(documentos, contratos);

  console.log(`\n    Resumo de downloads:`);
  for (const doc of downloadedDocs) {
    if (doc.error) {
      console.log(`    ❌ ${doc.nome} (${doc.tipo}): ERRO — ${doc.error}`);
    } else if (doc.contentType === "text") {
      console.log(`    ✅ ${doc.nome} (${doc.tipo}): TEXT — ${doc.text?.length ?? 0} chars`);
      if (doc.text) {
        console.log(`       Preview: "${doc.text.substring(0, 150).replace(/\n/g, " ")}..."`);
      }
    } else {
      console.log(`    🖼️  ${doc.nome} (${doc.tipo}): IMAGE — ${doc.imageData?.length ?? 0} bytes (${doc.imageMimeType})`);
    }
  }

  // Step 4: Map to agents
  console.log("\n[4] Mapeando documentos para agentes...");
  const agentDocMap = mapDocumentsToAgents(downloadedDocs);

  for (const [agent, docs] of agentDocMap.entries()) {
    console.log(`    ${agent}: ${docs.length} doc(s) — ${docs.map(d => d.nome).join(", ")}`);
  }

  // Step 5: Test individual agent extraction
  const contextJson = JSON.stringify({
    reservaId: TEST_RESERVA_ID,
    planta: {
      empreendimento: reserva.unidade.empreendimento,
      bloco: reserva.unidade.bloco,
      numero: reserva.unidade.unidade,
    },
    pessoas: {
      titular: {
        nome: reserva.titular.nome,
        documento: reserva.titular.documento,
        rg: reserva.titular.rg,
        estado_civil: reserva.titular.estado_civil,
      },
    },
  }, null, 2);

  // Test whichever agents have documents
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agentsToTest: { name: AgentName; runner: (input: any, options?: any) => Promise<any> }[] = [
    { name: "cnh-agent", runner: runCnhAgent },
    { name: "rgcpf-agent", runner: runRgcpfAgent },
    { name: "quadro-resumo-agent", runner: runQuadroResumoAgent },
  ];

  for (const { name, runner } of agentsToTest) {
    const docs = agentDocMap.get(name);
    if (!docs || docs.length === 0) {
      console.log(`\n[5] Agente ${name}: SKIP — sem documentos`);
      continue;
    }

    console.log(`\n[5] Testando agente: ${name} (${docs.length} doc(s))...`);
    const input = buildAgentInput(docs, contextJson);
    console.log(`    Input: ${input.text.length} chars texto, ${input.images?.length ?? 0} imagens`);

    try {
      const result = await runner(input);
      console.log(`    OK: ${result.ok}`);
      console.log(`    Provider: ${result.provider} (${result.model})`);
      console.log(`    Attempts: ${result.attempts}`);
      if (result.ok) {
        console.log(`    Data:`);
        console.log(JSON.stringify(result.data, null, 2));
      } else {
        console.log(`    Error: ${result.error}`);
        if (result.raw) {
          console.log(`    Raw (first 500 chars): ${result.raw.substring(0, 500)}`);
        }
      }
    } catch (err) {
      console.error(`    EXCEPTION: ${err}`);
    }
  }

  console.log("\n=== TESTE CONCLUÍDO ===\n");
}

main().catch(console.error);
