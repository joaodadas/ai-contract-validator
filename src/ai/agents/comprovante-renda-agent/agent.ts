import type { AgentInput, AgentRunOptions, AgentResult } from "@/ai/_base/types";
import { runAgent } from "@/ai/_base/runAgent";
import { comprovanteRendaSchema, type ComprovanteRendaOutput } from "./schema";
import { COMPROVANTE_RENDA_PROMPT } from "./prompt";

export async function runComprovanteRendaAgent(
  input: AgentInput,
  options?: AgentRunOptions
): Promise<AgentResult<ComprovanteRendaOutput>> {
  const override = options?.promptOverride;
  return runAgent({
    agent: "comprovante-renda-agent",
    systemPrompt: override?.content ?? COMPROVANTE_RENDA_PROMPT,
    promptVersion: override?.version,
    userInput: input,
    schema: comprovanteRendaSchema,
    options,
  });
}
