import { BASE_PROMPT } from "./basePrompt";
import { CNH_PROMPT } from "@/ai/agents/cnh-agent/prompt";
import { RGCPF_PROMPT } from "@/ai/agents/rgcpf-agent/prompt";
import { ATO_PROMPT } from "@/ai/agents/ato-agent/prompt";
import { QUADRO_RESUMO_PROMPT } from "@/ai/agents/quadro-resumo-agent/prompt";
import { FLUXO_PROMPT } from "@/ai/agents/fluxo-agent/prompt";
import { PLANTA_PROMPT } from "@/ai/agents/planta-agent/prompt";
import { COMPROVANTE_RESIDENCIA_PROMPT } from "@/ai/agents/comprovante-residencia-agent/prompt";
import { DECLARACAO_RESIDENCIA_PROMPT } from "@/ai/agents/declaracao-residencia-agent/prompt";
import { CERTIDAO_ESTADO_CIVIL_PROMPT } from "@/ai/agents/certidao-estado-civil-agent/prompt";
import { TERMO_PROMPT } from "@/ai/agents/termo-agent/prompt";
import { CARTEIRA_TRABALHO_PROMPT } from "@/ai/agents/carteira-trabalho-agent/prompt";
import { COMPROVANTE_RENDA_PROMPT } from "@/ai/agents/comprovante-renda-agent/prompt";
import { CARTA_FIADOR_PROMPT } from "@/ai/agents/carta-fiador-agent/prompt";
import type { PromptKey } from "@/lib/prompt-keys";

export const PROMPT_DEFAULTS: Record<PromptKey, string> = {
  "extraction-base": BASE_PROMPT,
  "cnh-agent": CNH_PROMPT,
  "rgcpf-agent": RGCPF_PROMPT,
  "ato-agent": ATO_PROMPT,
  "quadro-resumo-agent": QUADRO_RESUMO_PROMPT,
  "fluxo-agent": FLUXO_PROMPT,
  "planta-agent": PLANTA_PROMPT,
  "comprovante-residencia-agent": COMPROVANTE_RESIDENCIA_PROMPT,
  "declaracao-residencia-agent": DECLARACAO_RESIDENCIA_PROMPT,
  "certidao-estado-civil-agent": CERTIDAO_ESTADO_CIVIL_PROMPT,
  "termo-agent": TERMO_PROMPT,
  "carteira-trabalho-agent": CARTEIRA_TRABALHO_PROMPT,
  "comprovante-renda-agent": COMPROVANTE_RENDA_PROMPT,
  "carta-fiador-agent": CARTA_FIADOR_PROMPT,
};
