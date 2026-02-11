"use server";

import { db } from "@/db";
import { usersTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export async function registerAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  const name = formData.get("name") as string;

  if (!email || !password || !confirmPassword) {
    return { error: "Todos os campos são obrigatórios" };
  }

  if (password !== confirmPassword) {
    return { error: "As senhas não coincidem" };
  }

  if (password.length < 6) {
    return { error: "A senha deve ter pelo menos 6 caracteres" };
  }

  try {
    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (existingUser) {
      return { error: "Este email já está cadastrado" };
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password);

    const [newUser] = await db
      .insert(usersTable)
      .values({
        email,
        password: hashedPassword,
        name: name || null,
      })
      .returning();

    // Create session
    await createSession(newUser.id);
  } catch (error) {
    console.error("Register error:", error);
    return { error: "Erro ao criar conta. Tente novamente." };
  }

  redirect("/dashboard");
}
