import type { AgentInput, AgentRunOptions, AgentResult } from "@/ai/_base/types";
import { runAgent } from "@/ai/_base/runAgent";
import { certidaoEstadoCivilSchema, type CertidaoEstadoCivilOutput } from "./schema";
import { CERTIDAO_ESTADO_CIVIL_PROMPT } from "./prompt";

export async function runCertidaoEstadoCivilAgent(
  input: AgentInput,
  options?: AgentRunOptions
): Promise<AgentResult<CertidaoEstadoCivilOutput>> {
  const override = options?.promptOverride;
  return runAgent({
    agent: "certidao-estado-civil-agent",
    systemPrompt: override?.content ?? CERTIDAO_ESTADO_CIVIL_PROMPT,
    promptVersion: override?.version,
    userInput: input,
    schema: certidaoEstadoCivilSchema,
    options,
  });
}
