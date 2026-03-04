import type { AgentInput, AgentRunOptions, AgentResult } from "@/ai/_base/types";
import { runAgent } from "@/ai/_base/runAgent";
import { rgcpfSchema, type RgcpfOutput } from "./schema";
import { RGCPF_PROMPT } from "./prompt";

export async function runRgcpfAgent(
  input: AgentInput,
  options?: AgentRunOptions
): Promise<AgentResult<RgcpfOutput>> {
  return runAgent({
    agent: "rgcpf-agent",
    systemPrompt: RGCPF_PROMPT,
    userInput: input,
    schema: rgcpfSchema,
    options,
  });
}
