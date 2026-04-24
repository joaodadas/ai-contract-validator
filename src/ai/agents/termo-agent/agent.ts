import type { AgentInput, AgentRunOptions, AgentResult } from "@/ai/_base/types";
import { runAgent } from "@/ai/_base/runAgent";
import { termoSchema, type TermoOutput } from "./schema";
import { TERMO_PROMPT } from "./prompt";

export async function runTermoAgent(
  input: AgentInput,
  options?: AgentRunOptions
): Promise<AgentResult<TermoOutput>> {
  const override = options?.promptOverride;
  return runAgent({
    agent: "termo-agent",
    systemPrompt: override?.content ?? TERMO_PROMPT,
    promptVersion: override?.version,
    userInput: input,
    schema: termoSchema,
    options,
  });
}
