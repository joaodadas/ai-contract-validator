import {
  fetchReserva,
  fetchContratos,
  fetchDocumentos,
} from "@/lib/cvcrm/client";
import { db } from "@/db";
import { reservationsTable, reservationAuditsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  insertReservationAudit,
  insertAuditLog,
  updateReservationStatus,
  getReservationByExternalId,
} from "@/db/queries";
import { analyzeContract } from "@/ai";
import type { AgentResult } from "@/ai";
import type {
  CvcrmTitular,
  CvcrmAssociado,
  Pessoa,
  ReservaProcessada,
  CvcrmDocumentoItem,
} from "@/lib/cvcrm/types";

function mapPessoa(raw: CvcrmTitular | CvcrmAssociado): Pessoa {
  return {
    nome: raw.nome,
    documento: raw.documento,
    email: raw.email,
    telefone: raw.telefone,
  };
}

export async function processarReserva(
  idReserva: number,
  idTransacao: number
): Promise<ReservaProcessada> {
  console.log(`[service] iniciando processamento — reserva: ${idReserva}, transacao: ${idTransacao}`);

  const apiResponse = await fetchReserva(idReserva);
  const reserva = Object.values(apiResponse)[0];

  if (!reserva) {
    throw new Error(`Reserva ${idReserva} não encontrada na resposta da CVCRM`);
  }

  console.log(`[cvcrm:reserva] situação: ${reserva.situacao.situacao.trim()}`);
  console.log(`[cvcrm:reserva] titular: ${reserva.titular.nome}`);
  console.log(`[cvcrm:reserva] unidade: ${reserva.unidade.bloco} — ${reserva.unidade.unidade} (andar ${reserva.unidade.andar})`);
  console.log(`[cvcrm:reserva] empreendimento: ${reserva.unidade.empreendimento}`);

  console.log(`[cvcrm:paralelo] buscando contratos e documentos...`);
  const [contratos, docsResponse] = await Promise.all([
    fetchContratos(idReserva),
    fetchDocumentos(idReserva),
  ]);

  const documentos: Record<string, CvcrmDocumentoItem[]> =
    docsResponse.dados?.documentos ?? {};

  console.log(`[cvcrm:paralelo] contratos encontrados: ${contratos.length}`);
  console.log(`[cvcrm:paralelo] grupos de documentos: ${Object.keys(documentos).join(", ")}`);
  for (const [grupo, docs] of Object.entries(documentos)) {
    console.log(`[cvcrm:paralelo]   ${grupo}: ${docs.length} documento(s)`);
  }

  const associados: Record<string, Pessoa> = {};
  for (const assoc of Object.values(reserva.associados ?? {})) {
    associados[assoc.tipo] = mapPessoa(assoc);
  }

  const tiposAssociados = Object.keys(associados);
  console.log(`[service] pessoas extraídas — titular: ${reserva.titular.nome}${tiposAssociados.length > 0 ? `, associados: ${tiposAssociados.join(", ")}` : ""}`);

  const resultado: ReservaProcessada = {
    reservaId: idReserva,
    transacaoId: idTransacao,
    situacao: reserva.situacao.situacao.trim(),
    planta: {
      empreendimento: reserva.unidade.empreendimento,
      andar: reserva.unidade.andar,
      bloco: reserva.unidade.bloco,
      numero: reserva.unidade.unidade,
    },
    pessoas: {
      titular: mapPessoa(reserva.titular),
      associados,
    },
    contratos,
    documentos,
  };

  await db
    .insert(reservationsTable)
    .values({
      externalId: String(idReserva),
      enterprise: reserva.unidade.empreendimento,
      titularNome: reserva.titular.nome,
      cvcrmSnapshot: resultado,
      status: "pending",
    })
    .onConflictDoUpdate({
      target: reservationsTable.externalId,
      set: {
        cvcrmSnapshot: resultado,
        titularNome: reserva.titular.nome,
        enterprise: reserva.unidade.empreendimento,
        updatedAt: new Date(),
      },
    });

  console.log(`[db] reserva salva — externalId: ${idReserva}, titular: ${reserva.titular.nome}, status: pending`);

  const dbReservation = await getReservationByExternalId(String(idReserva));
  if (dbReservation) {
    await runAgentAnalysis(dbReservation.id, resultado);
  }

  console.log(`[service] processamento concluído para reserva ${idReserva}`);
  return resultado;
}

async function runAgentAnalysis(
  reservationId: string,
  snapshot: ReservaProcessada
) {
  const startTime = Date.now();

  const audit = await insertReservationAudit({
    reservationId,
    ruleVersion: 1,
    promptVersion: "v1.0",
    status: "approved",
    score: null,
    resultJson: {},
    aiRawOutput: {},
    executionTimeMs: 0,
  });

  await insertAuditLog({
    reservationAuditId: audit.id,
    level: "info",
    message: "Análise de contrato iniciada",
    metadata: { agentCount: 6 },
  });

  try {
    const textInput = JSON.stringify(snapshot, null, 2);
    const analysis = await analyzeContract({ text: textInput });

    for (const result of analysis.results) {
      const agentResult = result as AgentResult<unknown>;
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
    const hasFailures = analysis.summary.failed_agents.length > 0;
    const finalStatus = hasFailures ? "divergent" as const : "approved" as const;

    await insertAuditLog({
      reservationAuditId: audit.id,
      level: hasFailures ? "warning" : "info",
      message: hasFailures
        ? `Análise concluída com falhas: ${analysis.summary.failed_agents.join(", ")}`
        : "Análise concluída com sucesso — todos os agentes aprovados",
      metadata: {
        summary: analysis.summary,
        executionTimeMs,
      },
    });

    await db
      .update(reservationAuditsTable)
      .set({
        status: finalStatus,
        score: hasFailures ? 0 : 100,
        resultJson: analysis,
        aiRawOutput: analysis.results.map((r) => ({
          agent: r.agent,
          raw: r.raw,
        })),
        executionTimeMs,
      })
      .where(eq(reservationAuditsTable.id, audit.id));

    await updateReservationStatus(reservationId, finalStatus);

    console.log(`[ai] análise concluída — status: ${finalStatus}, tempo: ${executionTimeMs}ms`);
  } catch (err) {
    const executionTimeMs = Date.now() - startTime;

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

    await updateReservationStatus(reservationId, "divergent");

    console.error(`[ai] erro fatal na análise — reserva: ${reservationId}`, err);
  }
}
