import { db } from "@/db";
import { promptConfigsTable } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { PROMPT_DEFAULTS } from "./prompt-defaults";
import { PROMPT_KEYS, type PromptKey } from "@/lib/prompt-keys";

export type PromptSnapshotEntry = Readonly<{ content: string; version: number }>;
export type PromptSnapshot = Readonly<Record<PromptKey, PromptSnapshotEntry>>;

function fallback(key: PromptKey): PromptSnapshotEntry {
  return Object.freeze({ content: PROMPT_DEFAULTS[key], version: 0 });
}

export async function loadPrompt(key: PromptKey): Promise<PromptSnapshotEntry> {
  try {
    const [row] = await db
      .select({
        content: promptConfigsTable.content,
        version: promptConfigsTable.version,
      })
      .from(promptConfigsTable)
      .where(
        and(
          eq(promptConfigsTable.agent, key),
          eq(promptConfigsTable.isActive, true),
        ),
      )
      .limit(1);

    if (row) return Object.freeze({ content: row.content, version: row.version });
  } catch (err) {
    console.warn(`[loadPrompt] DB lookup failed for ${key}, using fallback:`, err);
  }
  return fallback(key);
}

export async function snapshotPrompts(): Promise<PromptSnapshot> {
  const entries: Partial<Record<PromptKey, PromptSnapshotEntry>> = {};

  try {
    const rows = await db
      .select({
        agent: promptConfigsTable.agent,
        content: promptConfigsTable.content,
        version: promptConfigsTable.version,
      })
      .from(promptConfigsTable)
      .where(
        and(
          eq(promptConfigsTable.isActive, true),
          inArray(promptConfigsTable.agent, PROMPT_KEYS as unknown as string[]),
        ),
      );

    for (const row of rows) {
      if ((PROMPT_KEYS as readonly string[]).includes(row.agent)) {
        entries[row.agent as PromptKey] = Object.freeze({
          content: row.content,
          version: row.version,
        });
      }
    }
  } catch (err) {
    console.warn("[snapshotPrompts] DB lookup failed, using fallbacks for all keys:", err);
  }

  for (const key of PROMPT_KEYS) {
    if (!entries[key]) entries[key] = fallback(key);
  }

  return Object.freeze(entries as Record<PromptKey, PromptSnapshotEntry>);
}
