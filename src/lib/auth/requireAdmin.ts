import { redirect } from "next/navigation";
import { getSession } from "./session";
import type { User } from "@/db/schema";

export async function requireAdmin(): Promise<User> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }
  return session.user;
}
