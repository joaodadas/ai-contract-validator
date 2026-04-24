import type { AgentInput, AgentRunOptions, AgentResult } from "@/ai/_base/types";
import { runAgent } from "@/ai/_base/runAgent";
import { comprovanteResidenciaSchema, type ComprovanteResidenciaOutput } from "./schema";
import { COMPROVANTE_RESIDENCIA_PROMPT } from "./prompt";

export async function runComprovanteResidenciaAgent(
  input: AgentInput,
  options?: AgentRunOptions
): Promise<AgentResult<ComprovanteResidenciaOutput>> {
  const override = options?.promptOverride;
  return runAgent({
    agent: "comprovante-residencia-agent",
    systemPrompt: override?.content ?? COMPROVANTE_RESIDENCIA_PROMPT,
    promptVersion: override?.version,
    userInput: input,
    schema: comprovanteResidenciaSchema,
    options,
  });
}
