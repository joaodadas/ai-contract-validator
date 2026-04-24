import { db } from "@/db";
import { promptConfigsTable, type PromptConfig } from "@/db/schema";
import { and, desc, eq, max } from "drizzle-orm";
import type { PromptKey } from "@/lib/prompt-keys";

export async function getActivePrompt(key: PromptKey): Promise<PromptConfig | null> {
  const [row] = await db
    .select()
    .from(promptConfigsTable)
    .where(
      and(eq(promptConfigsTable.agent, key), eq(promptConfigsTable.isActive, true)),
    )
    .limit(1);
  return row ?? null;
}

export async function getPromptByKey(key: PromptKey): Promise<{
  versions: PromptConfig[];
  active: PromptConfig | null;
}> {
  const versions = await db
    .select()
    .from(promptConfigsTable)
    .where(eq(promptConfigsTable.agent, key))
    .orderBy(desc(promptConfigsTable.version));

  const active = versions.find((v) => v.isActive) ?? null;
  return { versions, active };
}

export type PromptConfigSummary = {
  key: string;
  activeVersion: number | null;
  totalVersions: number;
  lastEditedAt: Date | null;
  lastEditedBy: number | null;
};

export async function listPromptConfigs(): Promise<PromptConfigSummary[]> {
  const rows = await db
    .select({
      key: promptConfigsTable.agent,
      version: promptConfigsTable.version,
      isActive: promptConfigsTable.isActive,
      createdAt: promptConfigsTable.createdAt,
      createdBy: promptConfigsTable.createdBy,
    })
    .from(promptConfigsTable);

  const byKey = new Map<string, PromptConfigSummary>();
  for (const row of rows) {
    let acc = byKey.get(row.key);
    if (!acc) {
      acc = {
        key: row.key,
        activeVersion: null,
        totalVersions: 0,
        lastEditedAt: null,
        lastEditedBy: null,
      };
      byKey.set(row.key, acc);
    }
    acc.totalVersions += 1;
    if (row.isActive) acc.activeVersion = row.version;
    if (!acc.lastEditedAt || row.createdAt > acc.lastEditedAt) {
      acc.lastEditedAt = row.createdAt;
      acc.lastEditedBy = row.createdBy;
    }
  }
  return Array.from(byKey.values()).sort((a, b) => a.key.localeCompare(b.key));
}

export async function createDraft(input: {
  key: PromptKey;
  content: string;
  createdBy: number;
  notes?: string;
}): Promise<PromptConfig> {
  const [maxRow] = await db
    .select({ max: max(promptConfigsTable.version) })
    .from(promptConfigsTable)
    .where(eq(promptConfigsTable.agent, input.key));

  const nextVersion = (maxRow?.max ?? 0) + 1;

  try {
    const [row] = await db
      .insert(promptConfigsTable)
      .values({
        agent: input.key,
        version: nextVersion,
        content: input.content,
        notes: input.notes,
        createdBy: input.createdBy,
        isActive: false,
        isDefault: false,
      })
      .returning();
    if (!row) throw new Error("Failed to insert prompt_configs row");
    return row;
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      err.message.includes("prompt_configs_agent_version_unique_key")
    ) {
      throw new Error(
        `Concurrent draft creation detected for key "${input.key}". Please retry.`,
      );
    }
    throw err;
  }
}

export async function activateVersion(input: {
  key: PromptKey;
  version: number;
  activatedBy: number;
}): Promise<PromptConfig> {
  return await db.transaction(async (tx) => {
    const [target] = await tx
      .select()
      .from(promptConfigsTable)
      .where(
        and(
          eq(promptConfigsTable.agent, input.key),
          eq(promptConfigsTable.version, input.version),
        ),
      )
      .limit(1)
      .for("update");

    if (!target) {
      throw new Error(`Version ${input.version} not found for key ${input.key}`);
    }

    // Deactivate current active (if any)
    await tx
      .update(promptConfigsTable)
      .set({ isActive: false, deactivatedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(promptConfigsTable.agent, input.key),
          eq(promptConfigsTable.isActive, true),
        ),
      );

    // Activate target
    const [activated] = await tx
      .update(promptConfigsTable)
      .set({
        isActive: true,
        activatedBy: input.activatedBy,
        activatedAt: new Date(),
        deactivatedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(promptConfigsTable.id, target.id))
      .returning();

    if (!activated) throw new Error("Failed to activate row after verification");
    return activated;
  });
}
