import type { AgentInput, AgentRunOptions, AgentResult } from "@/ai/_base/types";
import { runAgent } from "@/ai/_base/runAgent";
import { cartaFiadorSchema, type CartaFiadorOutput } from "./schema";
import { CARTA_FIADOR_PROMPT } from "./prompt";

export async function runCartaFiadorAgent(
  input: AgentInput,
  options?: AgentRunOptions
): Promise<AgentResult<CartaFiadorOutput>> {
  const override = options?.promptOverride;
  return runAgent({
    agent: "carta-fiador-agent",
    systemPrompt: override?.content ?? CARTA_FIADOR_PROMPT,
    promptVersion: override?.version,
    userInput: input,
    schema: cartaFiadorSchema,
    options,
  });
}
