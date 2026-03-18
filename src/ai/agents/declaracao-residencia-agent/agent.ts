import type { AgentInput, AgentRunOptions, AgentResult } from "@/ai/_base/types";
import { runAgent } from "@/ai/_base/runAgent";
import { declaracaoResidenciaSchema, type DeclaracaoResidenciaOutput } from "./schema";
import { DECLARACAO_RESIDENCIA_PROMPT } from "./prompt";

export async function runDeclaracaoResidenciaAgent(
  input: AgentInput,
  options?: AgentRunOptions
): Promise<AgentResult<DeclaracaoResidenciaOutput>> {
  return runAgent({
    agent: "declaracao-residencia-agent",
    systemPrompt: DECLARACAO_RESIDENCIA_PROMPT,
    userInput: input,
    schema: declaracaoResidenciaSchema,
    options,
  });
}
