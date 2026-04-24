import { userRoleEnum, usersTable } from "@/db/schema";

describe("user role schema", () => {
  it("exposes enum with admin and auditor values", () => {
    expect(userRoleEnum.enumValues).toEqual(["admin", "auditor"]);
  });

  it("users table has role column that is not null", () => {
    expect(usersTable.role).toBeDefined();
    expect(usersTable.role.notNull).toBe(true);
  });
});
