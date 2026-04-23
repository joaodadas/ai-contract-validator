"use server";

import { revalidatePath } from "next/cache";
import { getDynamicAgentsConfig, saveDynamicAgentConfig, deleteDynamicAgentConfig } from "@/ai/_base/dynamic-storage";
import type { DynamicAgentConfig } from "@/ai/_base/dynamic-types";
import { db } from "@/db";
import { agentBackupsTable } from "@/db/schema";
import fs from "fs";
import path from "path";

export async function getAgentsAction(): Promise<Record<string, DynamicAgentConfig>> {
  return getDynamicAgentsConfig();
}

/**
 * Sincroniza o Banco de Dados para o Arquivo JSON
 * (Exporta o que está no front-end para o código)
 */
export async function syncDbToFileAction() {
  try {
    const filePath = path.join(process.cwd(), "data", "dynamic-agents.json");
    let oldContent = {};

    // 1. Ler arquivo antigo para backup se existir
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      oldContent = JSON.parse(fileContent);
    }

    // 2. Criar backup no banco de dados
    await db.insert(agentBackupsTable).values({
      content: oldContent,
      description: `Backup automático: Exportação Banco -> Arquivo JSON`
    });

    // 3. Buscar agentes atuais do banco
    const currentAgents = await getDynamicAgentsConfig();
    
    // 4. Formatar para o estilo do arquivo JSON
    const formattedData: Record<string, any> = {};
    for (const [slug, agent] of Object.entries(currentAgents)) {
      formattedData[slug] = {
        id: slug,
        name: agent.name,
        description: agent.description || "",
        prompt: agent.prompt,
        modelKey: agent.modelKey,
        isActive: agent.isActive,
        schema: agent.schema
      };
    }

    // 5. Sobrescrever arquivo
    fs.writeFileSync(filePath, JSON.stringify(formattedData, null, 2), "utf-8");

    return { ok: true, count: Object.keys(formattedData).length };
  } catch (error) {
    console.error("Error syncing database to file:", error);
    return { ok: false, error: String(error) };
  }
}

/**
 * Sincroniza o Arquivo JSON para o Banco de Dados
 * (Importa o que está no código para o front-end)
 */
export async function syncAgentsWithFileAction() {
  try {
    const filePath = path.join(process.cwd(), "data", "dynamic-agents.json");
    if (!fs.existsSync(filePath)) {
      throw new Error("Arquivo dynamic-agents.json não encontrado na pasta /data.");
    }

    const fileContent = fs.readFileSync(filePath, "utf-8");
    const agentsData = JSON.parse(fileContent);

    const entries = Object.entries(agentsData);
    for (const [slug, data] of entries as [string, any][]) {
      const config: DynamicAgentConfig = {
        id: slug,
        name: data.name,
        description: data.description || "",
        prompt: data.prompt,
        schema: data.schema,
        modelKey: data.modelKey,
        isActive: data.isActive ?? true,
      };
      await saveDynamicAgentConfig(config);
    }

    revalidatePath("/prompts");
    return { ok: true, count: entries.length };
  } catch (error) {
    console.error("Error syncing agents from file:", error);
    return { ok: false, error: String(error) };
  }
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
