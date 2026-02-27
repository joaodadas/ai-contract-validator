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

export function fetchContratos(idReserva: number) {
  return cvcrmFetch<CvcrmContrato[]>(
    `/api/v1/comercial/reservas/${idReserva}/contratos`
  );
}

export function fetchDocumentos(idReserva: number) {
  return cvcrmFetch<CvcrmDocumentosResponse>(
    `/api/v1/comercial/reservas/${idReserva}/documentos`
  );
}
