import {
  fetchReserva,
  fetchContratos,
  fetchDocumentos,
  alterarSituacao,
  enviarMensagem,
} from '@/lib/cvcrm/client';
import { db } from '@/db';
import { reservationsTable, reservationAuditsTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  insertReservationAudit,
  insertAuditLog,
  updateReservationStatus,
  getReservationByExternalId,
  getReservationById,
} from '@/db/queries';
import { analyzeContract, checkDocumentCompleteness } from '@/ai';
import type { AgentResult } from '@/ai';
import type {
  CvcrmTitular,
  CvcrmAssociado,
  Pessoa,
  ReservaProcessada,
  CvcrmDocumentoItem,
} from '@/lib/cvcrm/types';
import { filterDocuments } from '@/lib/cvcrm/constants';
import { downloadAllDocuments } from '@/lib/cvcrm/documentDownloader';
import { mapDocumentsToAgents } from '@/ai/orchestrator/agentDocumentMapper';

/** Strips undefined values so JSONB serialization never breaks */
function sanitizeMetadata(obj: unknown): Record<string, unknown> | undefined {
  if (obj == null) return undefined;
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return { error: 'metadata serialization failed' };
  }
}

/** Fire-and-forget audit log — never kills the pipeline */
async function safeAuditLog(data: Parameters<typeof insertAuditLog>[0]) {
  try {
    await insertAuditLog({
      ...data,
      metadata: sanitizeMetadata(data.metadata) ?? {},
    });
  } catch (err) {
    console.error(`[audit-log] falha ao salvar log: ${data.message?.substring(0, 100)}`, err);
  }
}

function mapPessoa(raw: CvcrmTitular | CvcrmAssociado): Pessoa {
  return {
    nome: raw.nome,
    documento: raw.documento,
    documento_tipo: raw.documento_tipo,
    email: raw.email,
    telefone: raw.telefone,
    celular: raw.celular,
    rg: raw.rg,
    rg_orgao_emissor: raw.rg_orgao_emissor,
    nascimento: raw.nascimento,
    estado_civil: raw.estado_civil,
    endereco: raw.endereco,
    bairro: raw.bairro,
    cidade: raw.cidade,
    estado: raw.estado,
    cep: raw.cep,
    sexo: raw.sexo,
    renda_familiar: 'renda_familiar' in raw ? raw.renda_familiar : null,
    porcentagem: raw.porcentagem,
    idpessoa_cv: raw.idpessoa_cv,
  };
}

export async function processarReserva(
  idReserva: number,
  idTransacao: number,
): Promise<ReservaProcessada> {
  console.log(
    `[service] iniciando processamento — reserva: ${idReserva}, transacao: ${idTransacao}`,
  );

  const apiResponse = await fetchReserva(idReserva);
  const reserva = Object.values(apiResponse)[0];

  if (!reserva) {
    throw new Error(`Reserva ${idReserva} não encontrada na resposta da CVCRM`);
  }

  console.log(`[cvcrm:reserva] situação: ${reserva.situacao.situacao.trim()}`);
  console.log(`[cvcrm:reserva] titular: ${reserva.titular.nome}`);
  console.log(
    `[cvcrm:reserva] unidade: ${reserva.unidade.bloco} — ${reserva.unidade.unidade} (andar ${reserva.unidade.andar})`,
  );
  console.log(
    `[cvcrm:reserva] empreendimento: ${reserva.unidade.empreendimento}`,
  );

  console.log(`[cvcrm:paralelo] buscando contratos e documentos...`);
  const [contratos, docsResponse] = await Promise.all([
    fetchContratos(idReserva),
    fetchDocumentos(idReserva),
  ]);

  const documentosRaw: Record<string, CvcrmDocumentoItem[]> =
    docsResponse.dados?.documentos ?? {};
  const documentos = filterDocuments(documentosRaw) as Record<string, CvcrmDocumentoItem[]>;

  console.log(`[cvcrm:paralelo] contratos encontrados: ${contratos.length}`);
  console.log(
    `[cvcrm:paralelo] grupos de documentos: ${Object.keys(documentos).join(', ')}`,
  );
  for (const [grupo, docs] of Object.entries(documentos)) {
    console.log(`[cvcrm:paralelo]   ${grupo}: ${docs.length} documento(s)`);
  }

  const associados: Record<string, Pessoa> = {};
  for (const assoc of Object.values(reserva.associados ?? {})) {
    associados[assoc.tipo] = mapPessoa(assoc);
  }

  const tiposAssociados = Object.keys(associados);
  console.log(
    `[service] pessoas extraídas — titular: ${reserva.titular.nome}${tiposAssociados.length > 0 ? `, associados: ${tiposAssociados.join(', ')}` : ''}`,
  );

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
      status: 'pending',
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

  console.log(
    `[db] reserva salva — externalId: ${idReserva}, titular: ${reserva.titular.nome}, status: pending`,
  );

  const dbReservation = await getReservationByExternalId(String(idReserva));
  if (dbReservation) {
    await runAgentAnalysis(dbReservation.id, resultado);
  }

  console.log(`[service] processamento concluído para reserva ${idReserva}`);
  return resultado;
}

export async function runAgentAnalysis(
  reservationId: string,
  snapshot: ReservaProcessada,
) {
  const startTime = Date.now();

  const audit = await insertReservationAudit({
    reservationId,
    ruleVersion: 2,
    promptVersion: 'v2.0',
    status: 'approved',
    score: null,
    resultJson: {},
    aiRawOutput: {},
    executionTimeMs: 0,
  });

  await safeAuditLog({
    reservationAuditId: audit.id,
    level: 'info',
    message: 'Análise de contrato iniciada',
    metadata: { agentCount: 14 },
  });

  const completeness = checkDocumentCompleteness(snapshot.documentos, snapshot.contratos);
  if (!completeness.complete) {
    console.log(
      `[ai] documentos obrigatórios faltando: ${completeness.missingGroups.join('; ')}`,
    );

    await safeAuditLog({
      reservationAuditId: audit.id,
      level: 'warning',
      message: `Documentos obrigatórios faltando: ${completeness.missingGroups.join('; ')}`,
      metadata: { completeness },
    });

    const executionTimeMs = Date.now() - startTime;
    await db
      .update(reservationAuditsTable)
      .set({
        status: 'divergent',
        score: 0,
        resultJson: {
          documentCompleteness: completeness,
          message: completeness.message,
        },
        executionTimeMs,
      })
      .where(eq(reservationAuditsTable.id, audit.id));

    await updateReservationStatus(reservationId, 'divergent');

    // Send missing documents message to CV CRM
    const syncEnabled = process.env.CVCRM_SYNC_ENABLED?.trim() === 'true';
    if (syncEnabled) {
      try {
        await enviarMensagem(snapshot.reservaId, completeness.message);
        await alterarSituacao(snapshot.reservaId, 40, 'Contrato com Pendencia', 'Validado por IA');
        console.log(`[cvcrm:sync] mensagem de documentos faltantes enviada — reserva: ${snapshot.reservaId}`);
      } catch (err) {
        console.error(`[cvcrm:sync] falha ao enviar mensagem ao CV — reserva: ${snapshot.reservaId}`, err);
      }
    }
    return;
  }

  try {
    // Download all document files and extract their content (PDF text / images)
    console.log(`[ai] downloading document files...`);
    const documentContents = await downloadAllDocuments(snapshot.documentos, snapshot.contratos);

    await safeAuditLog({
      reservationAuditId: audit.id,
      level: 'info',
      message: `Documentos baixados: ${documentContents.filter(d => !d.error).length} sucesso, ${documentContents.filter(d => d.error).length} falhas`,
      metadata: {
        totalDocuments: documentContents.length,
        successful: documentContents.filter(d => !d.error).length,
        failed: documentContents.filter(d => d.error).length,
        documents: documentContents.map(d => ({
          nome: d.nome?.substring(0, 100),
          tipo: d.tipo,
          contentType: d.contentType,
          ok: !d.error,
        })),
      },
    });

    // Map documents to their corresponding agents
    const documentMap = mapDocumentsToAgents(documentContents);

    // Context JSON: reservation metadata for cross-reference (not the document content)
    const contextJson = JSON.stringify({
      reservaId: snapshot.reservaId,
      situacao: snapshot.situacao,
      planta: snapshot.planta,
      pessoas: snapshot.pessoas,
    }, null, 2);

    const reservaPlanta = snapshot.planta
      ? { bloco: snapshot.planta.bloco, numero: snapshot.planta.numero }
      : undefined;

    const analysis = await analyzeContract(
      documentMap,
      contextJson,
      undefined,
      reservaPlanta,
    );

    for (const result of analysis.results) {
      const agentResult = result as AgentResult<unknown>;
      await safeAuditLog({
        reservationAuditId: audit.id,
        level: agentResult.ok ? 'info' : 'error',
        message: agentResult.ok
          ? `Agente ${agentResult.agent} concluído com sucesso`
          : `Agente ${agentResult.agent} falhou: ${agentResult.error ?? 'erro desconhecido'}`,
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
      analysis.formattedReport === undefined ||
      analysis.formattedReport !== 'Nenhuma divergência encontrada';

    const hasFailures = analysis.summary.failed_agents.length > 0;
    const finalStatus =
      hasDivergences || hasFailures
        ? ('divergent' as const)
        : ('approved' as const);

    const promptVersion =
      analysis.results.find((r) => r.promptVersion)?.promptVersion ?? 'v2.0';

    await safeAuditLog({
      reservationAuditId: audit.id,
      level: hasDivergences || hasFailures ? 'warning' : 'info',
      message: hasDivergences
        ? `Análise concluída com divergências`
        : hasFailures
          ? `Análise concluída com falhas: ${analysis.summary.failed_agents.join(', ')}`
          : 'Análise concluída com sucesso — todos os agentes aprovados',
      metadata: {
        summary: analysis.summary,
        financialComparison: analysis.financialComparison,
        plantaValidation: analysis.plantaValidation,
        validation: analysis.validation,
        formattedReport: analysis.formattedReport,
        executionTimeMs,
      },
    });

    await db
      .update(reservationAuditsTable)
      .set({
        status: finalStatus,
        score: hasDivergences ? 0 : hasFailures ? 0 : 100,
        resultJson: {
          ...analysis,
          formattedReport: analysis.formattedReport,
        },
        aiRawOutput: analysis.results.map((r) => ({
          agent: r.agent,
          raw: r.raw,
        })),
        executionTimeMs,
        promptVersion,
      })
      .where(eq(reservationAuditsTable.id, audit.id));

    await updateReservationStatus(reservationId, finalStatus);

    // Send validation report to CV CRM (mirrors n8n "Mensagem no CV" + "Altera situação")
    const syncEnabled = process.env.CVCRM_SYNC_ENABLED?.trim() === 'true';
    if (syncEnabled) {
      try {
        const mensagem = analysis.formattedReport ?? 'Análise concluída — relatório detalhado indisponível';
        await enviarMensagem(snapshot.reservaId, mensagem);
        // 39 = "Contrato com pendência" (divergente), 38 = approved
        const situacaoId = hasDivergences ? 39 : 38;
        const descricao = hasDivergences ? 'Contrato com Pendencia' : 'Contrato Validado';
        await alterarSituacao(snapshot.reservaId, situacaoId, descricao, 'Validado por IA');
        console.log(`[cvcrm:sync] mensagem e situação enviadas ao CV — reserva: ${snapshot.reservaId}, situacao: ${situacaoId}`);
      } catch (err) {
        console.error(`[cvcrm:sync] falha ao enviar relatório ao CV — reserva: ${snapshot.reservaId}`, err);
      }
    }

    console.log(
      `[ai] análise concluída — status: ${finalStatus}, tempo: ${executionTimeMs}ms, relatório: ${analysis.formattedReport?.substring(0, 100) ?? 'N/A'}`,
    );
  } catch (err) {
    const executionTimeMs = Date.now() - startTime;

    await safeAuditLog({
      reservationAuditId: audit.id,
      level: 'error',
      message: `Erro fatal na análise: ${err instanceof Error ? err.message : String(err)}`,
      metadata: { executionTimeMs },
    });

    await db
      .update(reservationAuditsTable)
      .set({
        status: 'error',
        score: 0,
        resultJson: { error: err instanceof Error ? err.message : String(err) },
        executionTimeMs,
      })
      .where(eq(reservationAuditsTable.id, audit.id));

    await updateReservationStatus(reservationId, 'divergent');

    // Notify CVCRM even on fatal error — reservation must not stay stuck
    const syncEnabled = process.env.CVCRM_SYNC_ENABLED?.trim() === 'true';
    if (syncEnabled) {
      try {
        const errorMsg = `Erro na análise automática: ${err instanceof Error ? err.message : String(err)}`;
        await enviarMensagem(snapshot.reservaId, errorMsg);
        await alterarSituacao(snapshot.reservaId, 39, 'Contrato com Pendencia', 'Validado por IA');
        console.log(`[cvcrm:sync] erro notificado ao CV — reserva: ${snapshot.reservaId}`);
      } catch (syncErr) {
        console.error(`[cvcrm:sync] falha ao notificar erro ao CV — reserva: ${snapshot.reservaId}`, syncErr);
      }
    }

    console.error(
      `[ai] erro fatal na análise — reserva: ${reservationId}`,
      err,
    );
  }
}

/**
 * Validates that a reservation can be reprocessed. Throws on invalid state.
 */
export async function validateReprocessable(reservationId: string) {
  const reservation = await getReservationById(reservationId);
  if (!reservation) {
    throw new Error(`Reserva ${reservationId} não encontrada`);
  }

  if (reservation.status === 'pending') {
    throw new Error(
      `Reserva ${reservationId} já está em processamento`,
    );
  }

  const snapshot = reservation.cvcrmSnapshot as ReservaProcessada | null;
  if (!snapshot) {
    throw new Error(
      `Reserva ${reservationId} não possui snapshot do CVCRM`,
    );
  }

  return { reservation, snapshot };
}

/**
 * Validates + resets status to pending. Called synchronously in the API route
 * BEFORE after() — so the client sees "pending" on page refresh.
 */
export async function prepareReprocess(reservationId: string) {
  await validateReprocessable(reservationId);
  await updateReservationStatus(reservationId, 'pending');
}

/**
 * Reprocesses a reservation — re-runs the full AI analysis pipeline.
 * Designed to run in background (via after()). Status already set to pending
 * by prepareReprocess().
 */
export async function reprocessReservation(reservationId: string) {
  const reservation = await getReservationById(reservationId);
  if (!reservation) {
    throw new Error(`Reserva ${reservationId} não encontrada`);
  }

  const snapshot = reservation.cvcrmSnapshot as ReservaProcessada | null;
  if (!snapshot) {
    throw new Error(`Reserva ${reservationId} não possui snapshot do CVCRM`);
  }

  console.log(
    `[service] reprocessando reserva ${reservationId}`,
  );

  await runAgentAnalysis(reservationId, snapshot);

  // Fetch updated reservation to return current status
  const updated = await getReservationById(reservationId);
  return {
    reprocessed: true,
    status: updated?.status ?? 'pending',
  };
}

export async function confirmReservation(
  reservationId: string,
  idSituacao: number,
  situacaoLabel: string,
) {
  const reservation = await getReservationById(reservationId);
  if (!reservation) {
    throw new Error(`Reserva ${reservationId} não encontrada`);
  }

  if (reservation.status !== 'approved' && reservation.status !== 'divergent') {
    throw new Error(
      `Reserva ${reservationId} não pode ser confirmada — status atual: ${reservation.status}`,
    );
  }

  await db
    .update(reservationsTable)
    .set({
      status: 'confirmed',
      cvcrmSituacao: situacaoLabel,
      updatedAt: new Date(),
    })
    .where(eq(reservationsTable.id, reservationId));

  console.log(
    `[service] reserva ${reservationId} confirmada — situação CVCRM: ${situacaoLabel}`,
  );

  const syncEnabled = process.env.CVCRM_SYNC_ENABLED?.trim() === 'true';

  if (syncEnabled) {
    const externalId = Number(reservation.externalId);
    try {
      await alterarSituacao(externalId, idSituacao);
      console.log(
        `[cvcrm:sync] situação atualizada no CVCRM — reserva: ${externalId}, idsituacao: ${idSituacao}`,
      );
      return { synced: true };
    } catch (err) {
      console.error(
        `[cvcrm:sync] falha ao sincronizar com CVCRM — reserva: ${externalId}`,
        err,
      );
      return {
        synced: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  console.log(
    `[cvcrm:sync] sync desativado (CVCRM_SYNC_ENABLED=false) — reserva: ${reservationId}`,
  );
  return { synced: false, reason: 'CVCRM_SYNC_ENABLED is disabled' };
}
