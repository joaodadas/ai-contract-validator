import type { AgentInput, AgentRunOptions, AgentResult } from "@/ai/_base/types";
import { runAgent } from "@/ai/_base/runAgent";
import { atoSchema, type AtoOutput } from "./schema";
import { ATO_PROMPT } from "./prompt";

export async function runAtoAgent(
  input: AgentInput,
  options?: AgentRunOptions
): Promise<AgentResult<AtoOutput>> {
  const override = options?.promptOverride;
  return runAgent({
    agent: "ato-agent",
    systemPrompt: override?.content ?? ATO_PROMPT,
    promptVersion: override?.version,
    userInput: input,
    schema: atoSchema,
    options,
  });
}
