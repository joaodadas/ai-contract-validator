import "dotenv/config";
import { db } from "../src/db";
import { usersTable } from "../src/db/schema";
import bcrypt from "bcryptjs";

async function main() {
  const email = "admin@lyx.com.br";
  const password = "admin";
  const hashedPassword = await bcrypt.hash(password, 10);

  console.log(`👤 Criando usuário admin: ${email}...`);

  try {
    await db.insert(usersTable).values({
      name: "Administrador",
      email: email,
      password: hashedPassword,
    }).onConflictDoNothing();

    console.log("✅ Usuário administrador criado com sucesso!");
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Senha: ${password}`);
  } catch (error) {
    console.error("❌ Erro ao criar usuário:", error);
  }

  process.exit(0);
}

main();
