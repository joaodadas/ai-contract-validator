import type { AgentInput, AgentRunOptions, AgentResult } from "@/ai/_base/types";
import { runAgent } from "@/ai/_base/runAgent";
import { fluxoSchema, type FluxoOutput } from "./schema";
import { FLUXO_PROMPT } from "./prompt";

export async function runFluxoAgent(
  input: AgentInput,
  options?: AgentRunOptions
): Promise<AgentResult<FluxoOutput>> {
  const override = options?.promptOverride;
  return runAgent({
    agent: "fluxo-agent",
    systemPrompt: override?.content ?? FLUXO_PROMPT,
    promptVersion: override?.version,
    userInput: input,
    schema: fluxoSchema,
    options,
  });
}
