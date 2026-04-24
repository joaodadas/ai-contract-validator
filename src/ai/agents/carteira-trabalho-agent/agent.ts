import type { AgentInput, AgentRunOptions, AgentResult } from "@/ai/_base/types";
import { runAgent } from "@/ai/_base/runAgent";
import { carteiraTrabalhoSchema, type CarteiraTrabalhoOutput } from "./schema";
import { CARTEIRA_TRABALHO_PROMPT } from "./prompt";

export async function runCarteiraTrabalhoAgent(
  input: AgentInput,
  options?: AgentRunOptions
): Promise<AgentResult<CarteiraTrabalhoOutput>> {
  const override = options?.promptOverride;
  return runAgent({
    agent: "carteira-trabalho-agent",
    systemPrompt: override?.content ?? CARTEIRA_TRABALHO_PROMPT,
    promptVersion: override?.version,
    userInput: input,
    schema: carteiraTrabalhoSchema,
    options,
  });
}
