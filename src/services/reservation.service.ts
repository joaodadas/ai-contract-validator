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
  const apiResponse = await fetchReserva(idReserva);
  const reserva = Object.values(apiResponse)[0];

  if (!reserva) {
    throw new Error(`Reserva ${idReserva} não encontrada na resposta da CVCRM`);
  }

  // Busca contratos e documentos em paralelo
  const [contratos, docsResponse] = await Promise.all([
    fetchContratos(idReserva),
    fetchDocumentos(idReserva),
  ]);

  // Documentos agrupados por tipo de pessoa: { titular: [...], comprador: [...], fiador: [...] }
  const documentos: Record<string, CvcrmDocumentoItem[]> =
    docsResponse.dados?.documentos ?? {};

  // Extrai associados mapeados por tipo (Fiador, Cônjuge, etc.)
  const associados: Record<string, Pessoa> = {};
  for (const assoc of Object.values(reserva.associados ?? {})) {
    associados[assoc.tipo] = mapPessoa(assoc);
  }

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

  return resultado;
}
