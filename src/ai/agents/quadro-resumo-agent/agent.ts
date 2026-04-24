import type { AgentInput, AgentRunOptions, AgentResult } from "@/ai/_base/types";
import { runAgent } from "@/ai/_base/runAgent";
import { quadroResumoSchema, type QuadroResumoOutput } from "./schema";
import { QUADRO_RESUMO_PROMPT } from "./prompt";

export async function runQuadroResumoAgent(
  input: AgentInput,
  options?: AgentRunOptions
): Promise<AgentResult<QuadroResumoOutput>> {
  const override = options?.promptOverride;
  return runAgent({
    agent: "quadro-resumo-agent",
    systemPrompt: override?.content ?? QUADRO_RESUMO_PROMPT,
    promptVersion: override?.version,
    userInput: input,
    schema: quadroResumoSchema,
    options,
  });
}
