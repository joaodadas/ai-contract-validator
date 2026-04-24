import { loadPrompt, snapshotPrompts } from "@/ai/_base/loadPrompt";
import { db } from "@/db";
import { promptConfigsTable, usersTable } from "@/db/schema";
import { PROMPT_DEFAULTS } from "@/ai/_base/prompt-defaults";
import { eq } from "drizzle-orm";

describe("loadPrompt / snapshotPrompts", () => {
  let adminId: number;

  beforeAll(async () => {
    const [u] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.role, "admin"))
      .limit(1);
    if (!u) throw new Error("Need an admin user for these tests");
    adminId = u.id;
  });

  // We'll use carta-fiador-agent as our test scratch key (assumes seed exists).
  const TEST_KEY = "carta-fiador-agent" as const;

  async function resetTestKey() {
    await db.delete(promptConfigsTable).where(eq(promptConfigsTable.agent, TEST_KEY));
    // Re-seed v1 as active+default so DB state is clean between tests
    await db.insert(promptConfigsTable).values({
      agent: TEST_KEY,
      version: 1,
      content: PROMPT_DEFAULTS[TEST_KEY],
      isActive: true,
      isDefault: true,
      createdBy: adminId,
      activatedBy: adminId,
      activatedAt: new Date(),
    });
  }

  beforeEach(async () => {
    await resetTestKey();
  });

  afterAll(async () => {
    await resetTestKey();
  });

  it("loadPrompt returns the active row when present", async () => {
    // Override active row content to something recognizable
    await db
      .update(promptConfigsTable)
      .set({ content: "CUSTOM CONTENT" })
      .where(eq(promptConfigsTable.agent, TEST_KEY));

    const r = await loadPrompt(TEST_KEY);
    expect(r.content).toBe("CUSTOM CONTENT");
    expect(r.version).toBe(1);
  });

  it("loadPrompt falls back to hardcoded default when no active row", async () => {
    // Deactivate the seeded row
    await db
      .update(promptConfigsTable)
      .set({ isActive: false })
      .where(eq(promptConfigsTable.agent, TEST_KEY));

    const r = await loadPrompt(TEST_KEY);
    expect(r.content).toBe(PROMPT_DEFAULTS[TEST_KEY]);
    expect(r.version).toBe(0);
  });

  it("snapshotPrompts returns all 14 keys", async () => {
    const snap = await snapshotPrompts();
    expect(Object.keys(snap)).toHaveLength(14);
    expect(snap["extraction-base"]).toBeDefined();
    expect(snap["cnh-agent"]).toBeDefined();
    expect(snap[TEST_KEY]).toBeDefined();
  });

  it("snapshotPrompts returns a frozen root and frozen entries", async () => {
    const snap = await snapshotPrompts();
    expect(Object.isFrozen(snap)).toBe(true);
    expect(Object.isFrozen(snap[TEST_KEY])).toBe(true);
  });

  it("snapshotPrompts result is stable — subsequent DB writes do not affect the captured snapshot", async () => {
    const snap = await snapshotPrompts();
    const before = snap[TEST_KEY].content;

    // Mutate the DB after snapshot was taken
    await db
      .update(promptConfigsTable)
      .set({ content: "CHANGED AFTER SNAPSHOT" })
      .where(eq(promptConfigsTable.agent, TEST_KEY));

    expect(snap[TEST_KEY].content).toBe(before);
  });
});
