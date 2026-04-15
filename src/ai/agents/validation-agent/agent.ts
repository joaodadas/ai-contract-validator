import type { AgentInput, AgentRunOptions, AgentResult } from "@/ai/_base/types";
import { runAgent } from "@/ai/_base/runAgent";
import { validationSchema, type ValidationOutput } from "./schema";
import { VALIDATION_PROMPT } from "./prompt";

export async function runValidationAgent(
  input: AgentInput,
  options?: AgentRunOptions
): Promise<AgentResult<ValidationOutput>> {
  return runAgent({
    agent: "validation-agent",
    systemPrompt: VALIDATION_PROMPT,
    userInput: input,
    schema: validationSchema,
    options: {
      ...options,
      maxTokens: options?.maxTokens ?? 8192,
    },
  });
}
