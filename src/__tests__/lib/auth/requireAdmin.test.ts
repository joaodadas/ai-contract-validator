import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

jest.mock("@/lib/auth/session");
jest.mock("next/navigation", () => ({ redirect: jest.fn() }));

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockedRedirect = redirect as unknown as jest.Mock;

describe("requireAdmin", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns user when role is admin", async () => {
    mockedGetSession.mockResolvedValue({
      user: { id: 1, email: "a@x.com", role: "admin" } as never,
      sessionId: "s",
    });
    const user = await requireAdmin();
    expect(user.role).toBe("admin");
    expect(mockedRedirect).not.toHaveBeenCalled();
  });

  it("redirects to /login when no session", async () => {
    mockedGetSession.mockResolvedValue(null);
    await requireAdmin().catch(() => {});
    expect(mockedRedirect).toHaveBeenCalledWith("/login");
  });

  it("redirects to /dashboard when role is auditor", async () => {
    mockedGetSession.mockResolvedValue({
      user: { id: 2, email: "b@x.com", role: "auditor" } as never,
      sessionId: "s",
    });
    await requireAdmin().catch(() => {});
    expect(mockedRedirect).toHaveBeenCalledWith("/dashboard");
  });
});
