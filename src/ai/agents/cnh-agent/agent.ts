import type { AgentInput, AgentRunOptions, AgentResult } from "@/ai/_base/types";
import { runAgent } from "@/ai/_base/runAgent";
import { cnhSchema, type CnhOutput } from "./schema";
import { CNH_PROMPT } from "./prompt";

export async function runCnhAgent(
  input: AgentInput,
  options?: AgentRunOptions
): Promise<AgentResult<CnhOutput>> {
  return runAgent({
    agent: "cnh-agent",
    systemPrompt: CNH_PROMPT,
    userInput: input,
    schema: cnhSchema,
    options,
  });
}
