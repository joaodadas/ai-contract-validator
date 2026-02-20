import {
  fetchReserva,
  fetchContratos,
  fetchDocumentos,
} from "@/lib/cvcrm/client";
import { db } from "@/db";
import { reservationsTable } from "@/db/schema";
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

  // Busca contratos e documentos em paralelo
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

  // Extrai associados mapeados por tipo (Fiador, Cônjuge, etc.)
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
      status: "pending",
    })
    .onConflictDoNothing();

  console.log(`[db] reserva salva — externalId: ${idReserva}, titular: ${reserva.titular.nome}, status: pending`);
  console.log(`[service] processamento concluído para reserva ${idReserva}`);

  return resultado;
}
