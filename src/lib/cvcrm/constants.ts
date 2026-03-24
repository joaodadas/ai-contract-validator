import type { AgentName } from "@/ai/_base/types";

/**
 * Required document groups for contract validation.
 * Each sub-array is an OR group — at least one document from each group must be present.
 */
export const REQUIRED_DOCUMENT_GROUPS = [
  ["Carteira nacional de habilitação (CNH)", "RG Principal", "CPF Principal"],
  ["Declaração de Residência", "Comprovante de Residência"],
  ["Ato"],
  ["Termo de ciência"],
  ["Fluxo"],
  [
    "Carteira de Trabalho",
    "Cartão de Crédito",
    "Comprovante de Renda",
    "Comprovante de Renda (Holerite)",
  ],
  ["Certidão de Nascimento", "Certidão de Estado Civil"],
  ["Quadro Resumo"],
  ["Planta"],
] as const;

/**
 * Flat list of all allowed document types (derived from REQUIRED_DOCUMENT_GROUPS).
 * Documents with types outside this list (e.g. "Outro") are filtered out.
 */
export const ALLOWED_DOCUMENT_TYPES: string[] = REQUIRED_DOCUMENT_GROUPS.flat();

/**
 * Maps each extraction agent to the document types it processes.
 */
export const AGENT_DOCUMENT_TYPES: Partial<Record<AgentName, string[]>> = {
  "cnh-agent": [
    "Carteira nacional de habilitação (CNH)",
    "CNH",
  ],
  "rgcpf-agent": ["RG Principal", "CPF Principal"],
  "comprovante-residencia-agent": ["Comprovante de Residência"],
  "declaracao-residencia-agent": ["Declaração de Residência"],
  "certidao-estado-civil-agent": ["Certidão de Estado Civil", "Certidão de Nascimento"],
  "carteira-trabalho-agent": ["Carteira de Trabalho"],
  "comprovante-renda-agent": [
    "Comprovante de Renda",
    "Comprovante de Renda (Holerite)",
    "Cartão de Crédito",
  ],
  "carta-fiador-agent": ["Carta Fiador"],
};

/**
 * Maps each extraction agent to matching contract name substrings (case-insensitive).
 */
export const AGENT_CONTRACT_NAMES: Partial<Record<AgentName, string[]>> = {
  "quadro-resumo-agent": ["quadro resumo"],
  "fluxo-agent": ["fluxo", "planilha"],
  "planta-agent": ["memorial", "planta"],
  "termo-agent": ["termo"],
  "ato-agent": ["instrumento", "promessa de compra", "contrato de venda"],
};

/**
 * Maps a document tipo string to its corresponding extraction agent.
 */
export function docTypeToAgent(tipo: string): AgentName | null {
  const lower = tipo.toLowerCase();
  if (lower.includes("cnh") || lower.includes("habilitação")) return "cnh-agent";
  if (lower.includes("rg") || lower.includes("cpf")) return "rgcpf-agent";
  if (lower.includes("comprovante de resid")) return "comprovante-residencia-agent";
  if (lower.includes("declaração de resid")) return "declaracao-residencia-agent";
  if (
    lower.includes("certidão de estado civil") ||
    lower.includes("certidão de nascimento")
  )
    return "certidao-estado-civil-agent";
  if (lower.includes("carteira de trabalho")) return "carteira-trabalho-agent";
  if (lower.includes("comprovante de renda") || lower.includes("holerite"))
    return "comprovante-renda-agent";
  if (lower.includes("carta") && lower.includes("fiador")) return "carta-fiador-agent";
  return null;
}

/**
 * Maps a contract name to its corresponding extraction agent.
 */
export function contractNameToAgent(name: string): AgentName | null {
  const lower = name.toLowerCase();
  if (lower.includes("quadro resumo")) return "quadro-resumo-agent";
  if (lower.includes("fluxo") || lower.includes("planilha")) return "fluxo-agent";
  if (lower.includes("memorial") || lower.includes("planta")) return "planta-agent";
  if (lower.includes("termo")) return "termo-agent";
  if (lower.includes("instrumento") || lower.includes("promessa de compra"))
    return "ato-agent";
  return null;
}

/**
 * Returns true if the document tipo is in the allowed list.
 */
export function isAllowedDocumentType(tipo: string): boolean {
  const lower = tipo.toLowerCase();
  return ALLOWED_DOCUMENT_TYPES.some((t) => t.toLowerCase() === lower);
}

/**
 * Filters a documentos record to only include allowed document types.
 */
export function filterDocuments(
  documentos: Record<string, Array<{ tipo: string; [key: string]: unknown }>>,
): Record<string, Array<{ tipo: string; [key: string]: unknown }>> {
  const filtered: Record<string, Array<{ tipo: string; [key: string]: unknown }>> = {};
  for (const [group, docs] of Object.entries(documentos)) {
    if (!Array.isArray(docs)) continue;
    const validDocs = docs.filter((d) => isAllowedDocumentType(d.tipo));
    if (validDocs.length > 0) {
      filtered[group] = validDocs;
    }
  }
  return filtered;
}
