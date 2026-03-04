import type { AgentInput, AgentRunOptions, AgentResult } from "@/ai/_base/types";
import { runAgent } from "@/ai/_base/runAgent";
import { fluxoSchema, type FluxoOutput } from "./schema";
import { FLUXO_PROMPT } from "./prompt";

export async function runFluxoAgent(
  input: AgentInput,
  options?: AgentRunOptions
): Promise<AgentResult<FluxoOutput>> {
  return runAgent({
    agent: "fluxo-agent",
    systemPrompt: FLUXO_PROMPT,
    userInput: input,
    schema: fluxoSchema,
    options,
  });
}
