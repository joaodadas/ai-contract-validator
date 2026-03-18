import type { AgentInput, AgentRunOptions, AgentResult } from "@/ai/_base/types";
import { runAgent } from "@/ai/_base/runAgent";
import { carteiraTrabalhoSchema, type CarteiraTrabalhoOutput } from "./schema";
import { CARTEIRA_TRABALHO_PROMPT } from "./prompt";

export async function runCarteiraTrabalhoAgent(
  input: AgentInput,
  options?: AgentRunOptions
): Promise<AgentResult<CarteiraTrabalhoOutput>> {
  return runAgent({
    agent: "carteira-trabalho-agent",
    systemPrompt: CARTEIRA_TRABALHO_PROMPT,
    userInput: input,
    schema: carteiraTrabalhoSchema,
    options,
  });
}
