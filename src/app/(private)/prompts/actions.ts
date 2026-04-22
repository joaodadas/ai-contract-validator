"use server";

import { revalidatePath } from "next/cache";
import { getDynamicAgentsConfig, saveDynamicAgentConfig, deleteDynamicAgentConfig } from "@/ai/_base/dynamic-storage";
import type { DynamicAgentConfig } from "@/ai/_base/dynamic-types";

export async function getAgentsAction(): Promise<Record<string, DynamicAgentConfig>> {
  return getDynamicAgentsConfig();
}

export async function saveAgentAction(config: DynamicAgentConfig) {
  try {
    const success = await saveDynamicAgentConfig(config);
    if (!success) throw new Error("Falha ao salvar no banco de dados.");
    
    revalidatePath("/prompts");
    return { ok: true };
  } catch (error) {
    console.error("Error saving agent:", error);
    return { ok: false, error: String(error) };
  }
}

export async function deleteAgentAction(agentId: string) {
  try {
    const success = await deleteDynamicAgentConfig(agentId);
    if (!success) throw new Error("Falha ao deletar do banco de dados.");
    
    revalidatePath("/prompts");
    return { ok: true };
  } catch (error) {
    console.error("Error deleting agent:", error);
    return { ok: false, error: String(error) };
  }
}
