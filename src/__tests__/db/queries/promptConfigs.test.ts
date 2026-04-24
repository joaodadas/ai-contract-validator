import {
  listPromptConfigs,
  getPromptByKey,
  getActivePrompt,
  createDraft,
  activateVersion,
} from "@/db/queries/prompt-configs";
import { db } from "@/db";
import { promptConfigsTable, usersTable } from "@/db/schema";
import { eq } from "drizzle-orm";

const TEST_AGENT = "cnh-agent" as const;

describe("prompt-configs queries", () => {
  let adminId: number;

  beforeAll(async () => {
    const [u] = await db.select({ id: usersTable.id }).from(usersTable).limit(1);
    if (!u) throw new Error("Need at least one user in the DB to run these tests");
    adminId = u.id;
  });

  beforeEach(async () => {
    await db.delete(promptConfigsTable).where(eq(promptConfigsTable.agent, TEST_AGENT));
  });

  afterAll(async () => {
    await db.delete(promptConfigsTable).where(eq(promptConfigsTable.agent, TEST_AGENT));
  });

  it("getActivePrompt returns null when no row exists", async () => {
    expect(await getActivePrompt("cnh-agent")).toBeNull();
  });

  it("createDraft inserts a non-active row with incremented version", async () => {
    const v1 = await createDraft({ key: "cnh-agent", content: "A", createdBy: adminId });
    expect(v1.version).toBe(1);
    expect(v1.isActive).toBe(false);

    const v2 = await createDraft({ key: "cnh-agent", content: "B", createdBy: adminId });
    expect(v2.version).toBe(2);
    expect(v2.isActive).toBe(false);
  });

  it("createDraft persists notes when provided", async () => {
    const v = await createDraft({
      key: TEST_AGENT,
      content: "A",
      createdBy: adminId,
      notes: "ajuste mãe/pai",
    });
    expect(v.notes).toBe("ajuste mãe/pai");

    // omitting notes leaves it null
    const v2 = await createDraft({ key: TEST_AGENT, content: "B", createdBy: adminId });
    expect(v2.notes).toBeNull();
  });

  it("activateVersion flips current active to the given version with audit trail", async () => {
    const v1 = await createDraft({ key: "cnh-agent", content: "A", createdBy: adminId });
    await db
      .update(promptConfigsTable)
      .set({ isActive: true, activatedBy: adminId, activatedAt: new Date() })
      .where(eq(promptConfigsTable.id, v1.id));

    const v2 = await createDraft({ key: "cnh-agent", content: "B", createdBy: adminId });
    const activated = await activateVersion({
      key: "cnh-agent",
      version: v2.version,
      activatedBy: adminId,
    });

    expect(activated.version).toBe(2);
    expect(activated.content).toBe("B");
    expect(activated.isActive).toBe(true);
    expect(activated.activatedBy).toBe(adminId);
    expect(activated.activatedAt).toBeInstanceOf(Date);

    const active = await getActivePrompt("cnh-agent");
    expect(active?.version).toBe(2);

    const [deactivated] = await db
      .select()
      .from(promptConfigsTable)
      .where(eq(promptConfigsTable.id, v1.id));
    expect(deactivated?.isActive).toBe(false);
    expect(deactivated?.deactivatedAt).toBeInstanceOf(Date);
  });

  it("activateVersion throws when the version does not exist", async () => {
    await expect(
      activateVersion({ key: "cnh-agent", version: 99, activatedBy: adminId }),
    ).rejects.toThrow(/not found/i);
  });

  it("partial unique index prevents two active rows for the same key", async () => {
    const v1 = await createDraft({ key: "cnh-agent", content: "A", createdBy: adminId });
    await db
      .update(promptConfigsTable)
      .set({ isActive: true, activatedBy: adminId, activatedAt: new Date() })
      .where(eq(promptConfigsTable.id, v1.id));

    const v2 = await createDraft({ key: "cnh-agent", content: "B", createdBy: adminId });
    await expect(
      db
        .update(promptConfigsTable)
        .set({ isActive: true, activatedBy: adminId, activatedAt: new Date() })
        .where(eq(promptConfigsTable.id, v2.id)),
    ).rejects.toThrow();
  });

  it("listPromptConfigs returns all configured keys with their active version", async () => {
    const v1 = await createDraft({ key: "cnh-agent", content: "A", createdBy: adminId });
    await db
      .update(promptConfigsTable)
      .set({ isActive: true, activatedBy: adminId, activatedAt: new Date() })
      .where(eq(promptConfigsTable.id, v1.id));

    const list = await listPromptConfigs();
    const cnh = list.find((x) => x.key === "cnh-agent");
    expect(cnh?.activeVersion).toBe(1);
    expect(cnh?.totalVersions).toBe(1);
  });

  it("getPromptByKey returns full version history sorted desc", async () => {
    await createDraft({ key: "cnh-agent", content: "A", createdBy: adminId });
    await createDraft({ key: "cnh-agent", content: "B", createdBy: adminId });

    const history = await getPromptByKey("cnh-agent");
    expect(history.versions).toHaveLength(2);
    expect(history.versions[0]?.version).toBe(2);
    expect(history.versions[1]?.version).toBe(1);
  });
});
