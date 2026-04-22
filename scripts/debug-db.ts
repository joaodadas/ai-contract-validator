import "dotenv/config";
import { db } from "@/db";
import { sql } from "drizzle-orm";

async function debug() {
  try {
    console.log("🔍 Verificando tabelas no banco de dados...");
    const result = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log("Tabelas encontradas:", result.rows.map(r => r.table_name));

    console.log("\n🔍 Verificando colunas da tabela 'agents'...");
    const columns = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'agents'
    `);
    console.log("Colunas em 'agents':", columns.rows);
  } catch (error) {
    console.error("❌ Erro ao depurar banco:", error);
  }
  process.exit(0);
}

debug();
