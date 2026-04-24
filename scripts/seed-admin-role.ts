import { db } from "@/db";
import { usersTable } from "@/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const email = "dadasjv@hotmail.com";
  const result = await db
    .update(usersTable)
    .set({ role: "admin" })
    .where(eq(usersTable.email, email))
    .returning({ id: usersTable.id, email: usersTable.email, role: usersTable.role });

  if (result.length === 0) {
    console.error(`No user found with email ${email} — create the user first via /register`);
    process.exit(1);
  }
  console.log("promoted:", result[0]);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
