import "dotenv/config";
import { db } from "@/db";
import { agentsTable } from "@/db/schema";
import fs from "fs";
import path from "path";

async function main() {
  console.log("🌱 Iniciando o seed de agentes...");

  const dataPath = path.join(process.cwd(), "data", "dynamic-agents.json");
  if (!fs.existsSync(dataPath)) {
    console.error("❌ Arquivo data/dynamic-agents.json não encontrado.");
    process.exit(1);
  }

  const agentsData = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  const agentsList = Object.values(agentsData);

  console.log(`📦 Encontrados ${agentsList.length} agentes para importar.`);

  for (const agent of agentsList as any) {
    console.log(`  - Processando: ${agent.slug || agent.id}`);
    
    // Converte o formato do JSON para o formato da tabela
    const agentToInsert = {
      slug: agent.slug || agent.id,
      name: agent.name,
      description: agent.description,
      prompt: agent.prompt,
      schemaDefinition: agent.schema,
      modelKey: agent.modelKey || "google_flash",
      isActive: agent.isActive !== undefined ? agent.isActive : true,
      updatedAt: new Date(),
    };

    try {
      // Upsert: Insere ou atualiza se já existir o slug
      await db.insert(agentsTable)
        .values(agentToInsert)
        .onConflictDoUpdate({
          target: agentsTable.slug,
          set: agentToInsert
        });
      
      console.log(`    ✅ ${agentToInsert.slug} sincronizado.`);
    } catch (error) {
      console.error(`    ❌ Erro ao sincronizar ${agentToInsert.slug}:`, error);
    }
  }

  console.log("\n✅ Seed finalizado com sucesso!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Erro fatal no seed:", err);
  process.exit(1);
});
