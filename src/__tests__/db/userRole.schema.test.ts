import { userRoleEnum, usersTable } from "@/db/schema";

describe("user role schema", () => {
  it("exposes enum with admin and auditor values", () => {
    expect(userRoleEnum.enumValues).toEqual(["admin", "auditor"]);
  });

  it("users table has role column with default auditor", () => {
    expect(usersTable.role).toBeDefined();
    expect(usersTable.role.notNull).toBe(true);
    // Drizzle exposes hasDefault and default directly on the column config object
    expect(usersTable.role.hasDefault).toBe(true);
    expect(usersTable.role.default).toBe("auditor");
  });
});
