import { CNH_PROMPT } from "./agents/cnh-agent/prompt";
import { RGCPF_PROMPT } from "./agents/rgcpf-agent/prompt";
import { ATO_PROMPT } from "./agents/ato-agent/prompt";
import { QUADRO_RESUMO_PROMPT } from "./agents/quadro-resumo-agent/prompt";
import { FLUXO_PROMPT } from "./agents/fluxo-agent/prompt";
import { PLANTA_PROMPT } from "./agents/planta-agent/prompt";
import { COMPROVANTE_RESIDENCIA_PROMPT } from "./agents/comprovante-residencia-agent/prompt";
import { DECLARACAO_RESIDENCIA_PROMPT } from "./agents/declaracao-residencia-agent/prompt";
import { CERTIDAO_ESTADO_CIVIL_PROMPT } from "./agents/certidao-estado-civil-agent/prompt";
import { TERMO_PROMPT } from "./agents/termo-agent/prompt";
import { CARTEIRA_TRABALHO_PROMPT } from "./agents/carteira-trabalho-agent/prompt";
import { COMPROVANTE_RENDA_PROMPT } from "./agents/comprovante-renda-agent/prompt";
import { CARTA_FIADOR_PROMPT } from "./agents/carta-fiador-agent/prompt";
import { VALIDATION_PROMPT } from "./agents/validation-agent/prompt";
import type { AgentName } from "./_base/types";

export const DEFAULT_PROMPTS: Record<AgentName, string> = {
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
  "validation-agent": VALIDATION_PROMPT,
};
