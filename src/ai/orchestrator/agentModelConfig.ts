import type { AgentName, ModelKey, AgentInput, AgentRunOptions } from "@/ai/_base/types";

/**
 * Default model assignment per agent.
 * Grok 4.1 Fast (xai_grok41_fast) for all agents — 100% success, $0.0068/reserva.
 * Fallback to Gemini 3.1 Flash Lite (google_flash_lite_31) — cross-provider resilience.
 */
export const AGENT_MODEL_DEFAULTS: Record<AgentName, ModelKey> = {
  "validation-agent": "xai_grok41_fast",
  "cnh-agent": "xai_grok41_fast",
  "rgcpf-agent": "xai_grok41_fast",
  "ato-agent": "xai_grok41_fast",
  "quadro-resumo-agent": "xai_grok41_fast",
  "fluxo-agent": "xai_grok41_fast",
  "planta-agent": "xai_grok41_fast",
  "comprovante-residencia-agent": "xai_grok41_fast",
  "declaracao-residencia-agent": "xai_grok41_fast",
  "certidao-estado-civil-agent": "xai_grok41_fast",
  "termo-agent": "xai_grok41_fast",
  "carteira-trabalho-agent": "xai_grok41_fast",
  "comprovante-renda-agent": "xai_grok41_fast",
  "carta-fiador-agent": "xai_grok41_fast",
};

/**
 * When true, agents assigned to Flash Lite that receive image/file input
 * are automatically upgraded to Grok 4.1 Fast for that specific run.
 * Currently disabled — Grok 4.1 Fast is already the default for all agents.
 */
export const UPGRADE_FLASH_ON_IMAGES = false;

/**
 * Resolves the final AgentRunOptions for a specific agent, considering:
 * 1. Explicit caller override (options.modelKey) takes highest priority
 * 2. Content-aware upgrade (when UPGRADE_FLASH_ON_IMAGES is true)
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
  const isFlashLite = defaultModel === "google_flash_lite_31" || defaultModel === "google_flash_25" || defaultModel === "google_flash";

  const resolvedModel = (UPGRADE_FLASH_ON_IMAGES && isFlashLite && hasVisualContent)
    ? "xai_grok41_fast" as ModelKey
    : defaultModel;

  return { ...baseOptions, modelKey: resolvedModel };
}
