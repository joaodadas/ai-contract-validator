import type { CvcrmApiResponse, CvcrmContrato, CvcrmDocumentosResponse } from "./types";

const CVCRM_BASE_URL = process.env.CVCRM_BASE_URL;
const CVCRM_EMAIL = process.env.CVCRM_EMAIL;
const CVCRM_TOKEN = process.env.CVCRM_TOKEN;

function getConfig(): { baseUrl: string; headers: Record<string, string> } {
  if (!CVCRM_BASE_URL || !CVCRM_EMAIL || !CVCRM_TOKEN) {
    throw new Error(
      "Variáveis de ambiente CVCRM_BASE_URL, CVCRM_EMAIL e CVCRM_TOKEN são obrigatórias"
    );
  }

  return {
    baseUrl: CVCRM_BASE_URL,
    headers: {
      email: CVCRM_EMAIL,
      token: CVCRM_TOKEN,
      "Content-Type": "application/json",
    },
  };
}

async function cvcrmFetch<T>(path: string): Promise<T> {
  const { baseUrl, headers } = getConfig();

  const res = await fetch(`${baseUrl}${path}`, {
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`CVCRM erro ${res.status} em ${path}: ${body}`);
  }

  return res.json() as Promise<T>;
}

async function cvcrmPost<T>(path: string, body: unknown): Promise<T> {
  const { baseUrl, headers } = getConfig();

  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CVCRM erro ${res.status} em POST ${path}: ${text}`);
  }

  return res.json() as Promise<T>;
}

export function fetchReserva(idReserva: number) {
  return cvcrmFetch<CvcrmApiResponse>(`/api/cvio/reserva/${idReserva}`);
}

type FiltrosReservaLista = {
  data_inicio?: string; // "YYYY-MM-DD"
  data_fim?: string;    // "YYYY-MM-DD"
};

export function fetchReservaLista(filtros: FiltrosReservaLista = {}) {
  const params = new URLSearchParams();
  if (filtros.data_inicio) params.set("data_inicio", filtros.data_inicio);
  if (filtros.data_fim) params.set("data_fim", filtros.data_fim);
  const qs = params.toString();
  return cvcrmFetch<CvcrmApiResponse>(`/api/cvio/reserva${qs ? `?${qs}` : ""}`);
}

export async function fetchContratos(idReserva: number, nomesFiltro?: string[]): Promise<CvcrmContrato[]> {
  const raw = await cvcrmFetch<CvcrmContrato[] | { dados?: { contratos?: CvcrmContrato[] } }>(
    `/api/v1/comercial/reservas/${idReserva}/contratos`
  );

  let contratos: CvcrmContrato[] = [];

  if (Array.isArray(raw)) {
    contratos = raw;
  } else if (raw?.dados?.contratos && Array.isArray(raw.dados.contratos)) {
    contratos = raw.dados.contratos;
  } else {
    console.warn(`[cvcrm:contratos] formato inesperado na resposta de contratos — reserva: ${idReserva}`);
    return [];
  }

  if (nomesFiltro && nomesFiltro.length > 0) {
    return contratos.filter(c => 
      nomesFiltro.some(nome => c.contrato.toLowerCase().includes(nome.toLowerCase()))
    );
  }

  return contratos;
}

export function fetchDocumentos(idReserva: number) {
  return cvcrmFetch<CvcrmDocumentosResponse>(
    `/api/v1/comercial/reservas/${idReserva}/documentos`
  );
}

export function alterarSituacao(idReserva: number, idSituacao: number, descricao?: string, comentario?: string) {
  return cvcrmPost<{ sucesso: boolean; mensagem?: string }>(
    "/api/v1/comercial/reservas/alterar-situacao",
    {
      idreserva_cv: idReserva,
      idsituacao_destino: idSituacao,
      descricao: descricao ?? "Contrato com pendencia",
      comentario: comentario ?? "Validação por IA",
    }
  );
}

export function enviarMensagem(
  idReserva: number,
  mensagem: string,
  options?: {
    exibirImobiliaria?: boolean;
    enviarEmailImobiliaria?: boolean;
    exibirCorretor?: boolean;
    enviarEmailCorretor?: boolean;
    exibirCorrespondente?: boolean;
    enviarEmailCorrespondente?: boolean;
    exibirRepasse?: boolean;
  }
) {
  return cvcrmPost<{ sucesso: boolean }>(
    "/api/v2/comercial/reservas/mensagens",
    {
      idreserva: idReserva,
      mensagem,
      exibir_imobiliaria: options?.exibirImobiliaria ?? true,
      enviar_email_imobiliaria: options?.enviarEmailImobiliaria ?? true,
      exibir_corretor: options?.exibirCorretor ?? true,
      enviar_email_corretor: options?.enviarEmailCorretor ?? true,
      exibir_correspondente: options?.exibirCorrespondente ?? true,
      enviar_email_correspondente: options?.enviarEmailCorrespondente ?? true,
      exibir_repasse: options?.exibirRepasse ?? false,
    }
  );
}
