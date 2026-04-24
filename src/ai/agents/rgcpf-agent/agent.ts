import type { AgentInput, AgentRunOptions, AgentResult } from "@/ai/_base/types";
import { runAgent } from "@/ai/_base/runAgent";
import { rgcpfSchema, type RgcpfOutput } from "./schema";
import { RGCPF_PROMPT } from "./prompt";

export async function runRgcpfAgent(
  input: AgentInput,
  options?: AgentRunOptions
): Promise<AgentResult<RgcpfOutput>> {
  const override = options?.promptOverride;
  return runAgent({
    agent: "rgcpf-agent",
    systemPrompt: override?.content ?? RGCPF_PROMPT,
    promptVersion: override?.version,
    userInput: input,
    schema: rgcpfSchema,
    options,
  });
}
