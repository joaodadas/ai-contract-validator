import type { AgentInput, AgentRunOptions, AgentResult } from "@/ai/_base/types";
import { runAgent } from "@/ai/_base/runAgent";
import { plantaSchema, type PlantaOutput } from "./schema";
import { PLANTA_PROMPT } from "./prompt";

export async function runPlantaAgent(
  input: AgentInput,
  options?: AgentRunOptions
): Promise<AgentResult<PlantaOutput>> {
  return runAgent({
    agent: "planta-agent",
    systemPrompt: PLANTA_PROMPT,
    userInput: input,
    schema: plantaSchema,
    options,
  });
}
