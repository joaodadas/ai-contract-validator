import type { AgentInput, AgentRunOptions, AgentResult } from "@/ai/_base/types";
import { runAgent } from "@/ai/_base/runAgent";
import { atoSchema, type AtoOutput } from "./schema";
import { ATO_PROMPT } from "./prompt";

export async function runAtoAgent(
  input: AgentInput,
  options?: AgentRunOptions
): Promise<AgentResult<AtoOutput>> {
  return runAgent({
    agent: "ato-agent",
    systemPrompt: ATO_PROMPT,
    userInput: input,
    schema: atoSchema,
    options,
  });
}
