import { promptConfigsTable } from "@/db/schema";

describe("prompt_configs schema", () => {
  it("has required columns", () => {
    const cols = Object.keys(promptConfigsTable);
    [
      "agent",
      "version",
      "isActive",
      "isDefault",
      "content",
      "notes",
      "createdBy",
      "activatedBy",
      "activatedAt",
      "deactivatedAt",
      "createdAt",
      "updatedAt",
    ].forEach((name) => expect(cols).toContain(name));
  });

  it("agent and content are not null", () => {
    expect(promptConfigsTable.agent.notNull).toBe(true);
    expect(promptConfigsTable.content.notNull).toBe(true);
  });

  it("isActive and isDefault default to false", () => {
    expect(promptConfigsTable.isActive.hasDefault).toBe(true);
    expect(promptConfigsTable.isDefault.hasDefault).toBe(true);
    expect(promptConfigsTable.isActive.default).toBe(false);
    expect(promptConfigsTable.isDefault.default).toBe(false);
  });

  it("createdBy is not null, activatedBy is nullable", () => {
    expect(promptConfigsTable.createdBy.notNull).toBe(true);
    expect(promptConfigsTable.activatedBy.notNull).toBe(false);
  });

  it("version is not null", () => {
    expect(promptConfigsTable.version.notNull).toBe(true);
  });
});
