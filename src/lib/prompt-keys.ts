export const PROMPT_KEYS = [
  "extraction-base",
  "cnh-agent",
  "rgcpf-agent",
  "ato-agent",
  "quadro-resumo-agent",
  "fluxo-agent",
  "planta-agent",
  "comprovante-residencia-agent",
  "declaracao-residencia-agent",
  "certidao-estado-civil-agent",
  "termo-agent",
  "carteira-trabalho-agent",
  "comprovante-renda-agent",
  "carta-fiador-agent",
] as const;

export type PromptKey = (typeof PROMPT_KEYS)[number];

export const CRITICAL_PROMPT_KEYS: ReadonlySet<PromptKey> = new Set<PromptKey>([
  "quadro-resumo-agent",
  "fluxo-agent",
]);

export function isPromptKey(x: string): x is PromptKey {
  return (PROMPT_KEYS as readonly string[]).includes(x);
}

export const PROMPT_KEY_LABELS: Record<PromptKey, string> = {
  "extraction-base": "Prompt Principal (base de extração)",
  "cnh-agent": "CNH",
  "rgcpf-agent": "RG / CPF",
  "ato-agent": "Ato de Reserva",
  "quadro-resumo-agent": "Quadro Resumo",
  "fluxo-agent": "Fluxo Financeiro",
  "planta-agent": "Planta",
  "comprovante-residencia-agent": "Comprovante de Residência",
  "declaracao-residencia-agent": "Declaração de Residência",
  "certidao-estado-civil-agent": "Certidão de Estado Civil",
  "termo-agent": "Termo",
  "carteira-trabalho-agent": "Carteira de Trabalho",
  "comprovante-renda-agent": "Comprovante de Renda",
  "carta-fiador-agent": "Carta do Fiador",
};
