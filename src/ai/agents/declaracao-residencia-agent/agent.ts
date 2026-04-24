import type { AgentInput, AgentRunOptions, AgentResult } from "@/ai/_base/types";
import { runAgent } from "@/ai/_base/runAgent";
import { declaracaoResidenciaSchema, type DeclaracaoResidenciaOutput } from "./schema";
import { DECLARACAO_RESIDENCIA_PROMPT } from "./prompt";

export async function runDeclaracaoResidenciaAgent(
  input: AgentInput,
  options?: AgentRunOptions
): Promise<AgentResult<DeclaracaoResidenciaOutput>> {
  const override = options?.promptOverride;
  return runAgent({
    agent: "declaracao-residencia-agent",
    systemPrompt: override?.content ?? DECLARACAO_RESIDENCIA_PROMPT,
    promptVersion: override?.version,
    userInput: input,
    schema: declaracaoResidenciaSchema,
    options,
  });
}
