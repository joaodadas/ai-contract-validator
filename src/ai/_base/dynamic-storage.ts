import { db } from "@/db";
import { agentsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { DynamicAgentConfig, DynamicFieldDefinition } from "./dynamic-types";
import type { ModelKey } from "./types";

/**
 * Retorna todas as configurações dinâmicas de agentes salvas no Banco de Dados.
 */
export async function getDynamicAgentsConfig(): Promise<Record<string, DynamicAgentConfig>> {
  try {
    const agents = await db.select().from(agentsTable);
    
    const configMap: Record<string, DynamicAgentConfig> = {};
    
    for (const agent of agents) {
      configMap[agent.slug] = {
        id: agent.slug,
        name: agent.name,
        description: agent.description || undefined,
        prompt: agent.prompt,
        schema: agent.schemaDefinition as DynamicFieldDefinition[],
        modelKey: agent.modelKey as ModelKey,
        isActive: agent.isActive
      };
    }
    
    return configMap;
  } catch (error) {
    console.error("[dynamic-storage] Erro ao ler agent configs do banco:", error);
    return {};
  }
}

/**
 * Retorna a configuração de um agente específico.
 */
export async function getDynamicAgentConfig(agentId: string): Promise<DynamicAgentConfig | null> {
  try {
    const [agent] = await db.select()
      .from(agentsTable)
      .where(eq(agentsTable.slug, agentId))
      .limit(1);
      
    if (!agent) return null;
    
    return {
      id: agent.slug,
      name: agent.name,
      description: agent.description || undefined,
      prompt: agent.prompt,
      schema: agent.schemaDefinition as DynamicFieldDefinition[],
      modelKey: agent.modelKey as ModelKey,
      isActive: agent.isActive
    };
  } catch (error) {
    console.error(`[dynamic-storage] Erro ao ler agente ${agentId}:`, error);
    return null;
  }
}

/**
 * Salva ou atualiza a configuração de um agente no banco.
 */
export async function saveDynamicAgentConfig(config: DynamicAgentConfig): Promise<boolean> {
  try {
    const data = {
      slug: config.id,
      name: config.name,
      description: config.description || null,
      prompt: config.prompt,
      schemaDefinition: config.schema,
      modelKey: config.modelKey || "google_flash",
      isActive: config.isActive,
      updatedAt: new Date(),
    };

    await db.insert(agentsTable)
      .values(data)
      .onConflictDoUpdate({
        target: agentsTable.slug,
        set: data
      });
      
    return true;
  } catch (error) {
    console.error("[dynamic-storage] Erro ao salvar agent no banco:", error);
    return false;
  }
}

/**
 * Remove a configuração de um agente do banco.
 */
export async function deleteDynamicAgentConfig(agentId: string): Promise<boolean> {
  try {
    await db.delete(agentsTable).where(eq(agentsTable.slug, agentId));
    return true;
  } catch (error) {
    console.error("[dynamic-storage] Erro ao deletar agent do banco:", error);
    return false;
  }
}
