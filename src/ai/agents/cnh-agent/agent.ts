import type { AgentInput, AgentRunOptions, AgentResult } from "@/ai/_base/types";
import { runAgent } from "@/ai/_base/runAgent";
import { cnhSchema, type CnhOutput } from "./schema";
import { CNH_PROMPT } from "./prompt";

export async function runCnhAgent(
  input: AgentInput,
  options?: AgentRunOptions
): Promise<AgentResult<CnhOutput>> {
  const override = options?.promptOverride;
  return runAgent({
    agent: "cnh-agent",
    systemPrompt: override?.content ?? CNH_PROMPT,
    promptVersion: override?.version,
    userInput: input,
    schema: cnhSchema,
    options,
  });
}
