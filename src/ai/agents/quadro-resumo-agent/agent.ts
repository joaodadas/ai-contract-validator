import type { AgentInput, AgentRunOptions, AgentResult } from "@/ai/_base/types";
import { runAgent } from "@/ai/_base/runAgent";
import { quadroResumoSchema, type QuadroResumoOutput } from "./schema";
import { QUADRO_RESUMO_PROMPT } from "./prompt";

export async function runQuadroResumoAgent(
  input: AgentInput,
  options?: AgentRunOptions
): Promise<AgentResult<QuadroResumoOutput>> {
  return runAgent({
    agent: "quadro-resumo-agent",
    systemPrompt: QUADRO_RESUMO_PROMPT,
    userInput: input,
    schema: quadroResumoSchema,
    options,
  });
}
