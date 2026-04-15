import type { AgentName, ModelKey, AgentInput, AgentRunOptions } from "@/ai/_base/types";

/**
 * Default model assignment per agent.
 * Flash (google_flash_25) for simple text extraction.
 * Pro (google_pro) for complex cross-validation.
 */
export const AGENT_MODEL_DEFAULTS: Record<AgentName, ModelKey> = {
  "validation-agent": "google_pro",
  "cnh-agent": "google_flash_25",
  "rgcpf-agent": "google_flash_25",
  "ato-agent": "google_flash_25",
  "quadro-resumo-agent": "google_flash_25",
  "fluxo-agent": "google_flash_25",
  "planta-agent": "google_flash_25",
  "comprovante-residencia-agent": "google_flash_25",
  "declaracao-residencia-agent": "google_flash_25",
  "certidao-estado-civil-agent": "google_flash_25",
  "termo-agent": "google_flash_25",
  "carteira-trabalho-agent": "google_flash_25",
  "comprovante-renda-agent": "google_flash_25",
  "carta-fiador-agent": "google_flash_25",
};

/**
 * When true, agents assigned to Flash that receive image/file input
 * are automatically upgraded to Pro for that specific run.
 */
export const UPGRADE_FLASH_ON_IMAGES = true;

/**
 * Resolves the final AgentRunOptions for a specific agent, considering:
 * 1. Explicit caller override (options.modelKey) takes highest priority
 * 2. Content-aware upgrade: Flash → Pro when images/files are present
 * 3. Static per-agent default from AGENT_MODEL_DEFAULTS
 */
export function resolveAgentOptions(
  agentName: AgentName,
  input: AgentInput,
  baseOptions?: AgentRunOptions,
): AgentRunOptions {
  if (baseOptions?.modelKey) return baseOptions;

  const defaultModel = AGENT_MODEL_DEFAULTS[agentName];
  const hasVisualContent = (input.images?.length ?? 0) > 0 || (input.files?.length ?? 0) > 0;
  const isFlash = defaultModel === "google_flash_25" || defaultModel === "google_flash";

  const resolvedModel = (UPGRADE_FLASH_ON_IMAGES && isFlash && hasVisualContent)
    ? "google_pro" as ModelKey
    : defaultModel;

  return { ...baseOptions, modelKey: resolvedModel };
}
