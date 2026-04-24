import { db } from "@/db";
import { promptConfigsTable, usersTable } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { PROMPT_DEFAULTS } from "@/ai/_base/prompt-defaults";
import { PROMPT_KEYS } from "@/lib/prompt-keys";

async function main() {
  const [admin] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.role, "admin"))
    .limit(1);

  if (!admin) {
    console.error("No admin user found — run scripts/seed-admin-role.ts first");
    process.exit(1);
  }

  const now = new Date();
  let inserted = 0;
  let skipped = 0;

  for (const key of PROMPT_KEYS) {
    const existing = await db
      .select({ id: promptConfigsTable.id })
      .from(promptConfigsTable)
      .where(
        and(
          eq(promptConfigsTable.agent, key),
          eq(promptConfigsTable.version, 1),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      console.log(`- ${key}: v1 already exists, skipping`);
      skipped += 1;
      continue;
    }

    await db.insert(promptConfigsTable).values({
      agent: key,
      version: 1,
      content: PROMPT_DEFAULTS[key],
      isActive: true,
      isDefault: true,
      createdBy: admin.id,
      activatedBy: admin.id,
      activatedAt: now,
    });
    inserted += 1;
    console.log(`- ${key}: v1 inserted`);
  }

  console.log(`\nTotal: ${inserted} inserted, ${skipped} skipped (of ${PROMPT_KEYS.length})`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
