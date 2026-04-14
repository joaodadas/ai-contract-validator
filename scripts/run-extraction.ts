/**
 * Script para rodar a extração de IA numa reserva específica,
 * pulando a checagem de completude de documentos.
 *
 * Usage: npx tsx scripts/run-extraction.ts <externalId>
 */
import { db } from "@/db";
import { reservationAuditsTable } from "@/db/schema";
import {
  getReservationByExternalId,
  insertReservationAudit,
  insertAuditLog,
  updateReservationStatus,
} from "@/db/queries";
import { analyzeContract } from "@/ai";
import type { AgentResult } from "@/ai";
import type { ReservaProcessada } from "@/lib/cvcrm/types";
import { downloadAllDocuments } from "@/lib/cvcrm/documentDownloader";
import { mapDocumentsToAgents } from "@/ai/orchestrator/agentDocumentMapper";
import { eq } from "drizzle-orm";

const externalId = process.argv[2];
if (!externalId) {
  console.error("Usage: npx tsx scripts/run-extraction.ts <externalId>");
  process.exit(1);
}

async function main() {
  const reservation = await getReservationByExternalId(externalId);
  if (!reservation) {
    console.error(`Reserva ${externalId} não encontrada no banco`);
    process.exit(1);
  }

  const snapshot = reservation.cvcrmSnapshot as ReservaProcessada;
  console.log(`[script] Rodando extração para reserva ${externalId} (${reservation.titularNome})`);
  console.log(`[script] Pulando checagem de completude de documentos`);

  const startTime = Date.now();

  const audit = await insertReservationAudit({
    reservationId: reservation.id,
    ruleVersion: 2,
    promptVersion: "v2.0",
    status: "approved",
    score: null,
    resultJson: {},
    aiRawOutput: {},
    executionTimeMs: 0,
  });

  await insertAuditLog({
    reservationAuditId: audit.id,
    level: "info",
    message: "Análise de contrato iniciada (script manual, sem checagem de completude)",
    metadata: { agentCount: 14 },
  });

  await updateReservationStatus(reservation.id, "pending");

  try {
    console.log(`[script] Baixando documentos...`);
    const documentContents = await downloadAllDocuments(snapshot.documentos, snapshot.contratos);

    const successCount = documentContents.filter((d) => !d.error).length;
    const failCount = documentContents.filter((d) => d.error).length;
    console.log(`[script] Download: ${successCount} sucesso, ${failCount} falhas`);

    await insertAuditLog({
      reservationAuditId: audit.id,
      level: "info",
      message: `Documentos baixados: ${successCount} sucesso, ${failCount} falhas`,
      metadata: {
        downloaded: documentContents.map((d) => ({
          nome: d.nome,
          tipo: d.tipo,
          contentType: d.contentType,
          hasText: !!d.text,
          hasImage: !!d.imageData,
          error: d.error,
        })),
      },
    });

    const documentMap = mapDocumentsToAgents(documentContents);

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

    const reservaPlanta = snapshot.planta
      ? { bloco: snapshot.planta.bloco, numero: snapshot.planta.numero }
      : undefined;

    console.log(`[script] Rodando pipeline de 4 fases...`);
    const analysis = await analyzeContract(
      documentMap,
      contextJson,
      undefined,
      reservaPlanta,
    );

    for (const result of analysis.results) {
      const agentResult = result as AgentResult<unknown>;
      console.log(
        `  ${agentResult.ok ? "✓" : "✗"} ${agentResult.agent} (${agentResult.provider}/${agentResult.model}, ${agentResult.attempts} tentativa(s))`,
      );
      await insertAuditLog({
        reservationAuditId: audit.id,
        level: agentResult.ok ? "info" : "error",
        message: agentResult.ok
          ? `Agente ${agentResult.agent} concluído com sucesso`
          : `Agente ${agentResult.agent} falhou: ${agentResult.error ?? "erro desconhecido"}`,
        metadata: {
          agent: agentResult.agent,
          ok: agentResult.ok,
          provider: agentResult.provider,
          model: agentResult.model,
          attempts: agentResult.attempts,
          data: agentResult.ok ? agentResult.data : undefined,
        },
      });
    }

    const executionTimeMs = Date.now() - startTime;

    const hasDivergences =
      analysis.formattedReport !== undefined &&
      analysis.formattedReport !== "Nenhuma divergência encontrada";

    const hasFailures = analysis.summary.failed_agents.length > 0;
    const finalStatus = hasDivergences || hasFailures ? "divergent" : "approved";

    await db
      .update(reservationAuditsTable)
      .set({
        status: finalStatus,
        score: hasDivergences || hasFailures ? 0 : 100,
        resultJson: {
          ...analysis,
          formattedReport: analysis.formattedReport,
        },
        aiRawOutput: analysis.results.map((r) => ({
          agent: r.agent,
          raw: r.raw,
        })),
        executionTimeMs,
      })
      .where(eq(reservationAuditsTable.id, audit.id));

    await updateReservationStatus(reservation.id, finalStatus);

    console.log(`\n[script] Concluído!`);
    console.log(`  Status: ${finalStatus}`);
    console.log(`  Tempo: ${executionTimeMs}ms`);
    console.log(`  Agentes OK: ${analysis.results.filter((r) => r.ok).length}/${analysis.results.length}`);
    console.log(`  Divergências: ${hasDivergences ? "Sim" : "Não"}`);
  } catch (err) {
    const executionTimeMs = Date.now() - startTime;
    console.error(`[script] Erro fatal:`, err);

    await insertAuditLog({
      reservationAuditId: audit.id,
      level: "error",
      message: `Erro fatal na análise: ${err instanceof Error ? err.message : String(err)}`,
      metadata: { executionTimeMs },
    });

    await db
      .update(reservationAuditsTable)
      .set({
        status: "error",
        score: 0,
        resultJson: { error: err instanceof Error ? err.message : String(err) },
        executionTimeMs,
      })
      .where(eq(reservationAuditsTable.id, audit.id));

    await updateReservationStatus(reservation.id, "divergent");
  }

  process.exit(0);
}

main();
