import type { AgentInput, AgentRunOptions, AgentResult } from "@/ai/_base/types";
import { runAgent } from "@/ai/_base/runAgent";
import { cartaFiadorSchema, type CartaFiadorOutput } from "./schema";
import { CARTA_FIADOR_PROMPT } from "./prompt";

export async function runCartaFiadorAgent(
  input: AgentInput,
  options?: AgentRunOptions
): Promise<AgentResult<CartaFiadorOutput>> {
  return runAgent({
    agent: "carta-fiador-agent",
    systemPrompt: CARTA_FIADOR_PROMPT,
    userInput: input,
    schema: cartaFiadorSchema,
    options,
  });
}
