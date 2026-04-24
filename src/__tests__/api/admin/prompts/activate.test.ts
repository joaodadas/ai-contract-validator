import { POST } from "@/app/api/admin/prompts/[key]/activate/route";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { activateVersion } from "@/db/queries/prompt-configs";

jest.mock("@/lib/auth/requireAdmin");
jest.mock("@/db/queries/prompt-configs");

const mockedAdmin = requireAdmin as jest.MockedFunction<typeof requireAdmin>;
const mockedActivate = activateVersion as jest.MockedFunction<typeof activateVersion>;

describe("POST /api/admin/prompts/[key]/activate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAdmin.mockResolvedValue({ id: 1, role: "admin" } as never);
  });

  it("activates the version and returns 200", async () => {
    mockedActivate.mockResolvedValue({ id: "x", version: 3, isActive: true } as never);
    const req = new Request("http://t", {
      method: "POST",
      body: JSON.stringify({ version: 3 }),
    });
    const res = await POST(req, { params: Promise.resolve({ key: "cnh-agent" }) });
    expect(res.status).toBe(200);
    expect(mockedActivate).toHaveBeenCalledWith({
      key: "cnh-agent",
      version: 3,
      activatedBy: 1,
    });
    const body = await res.json();
    expect(body.version).toBe(3);
  });

  it("returns 409 when the version does not exist", async () => {
    mockedActivate.mockRejectedValue(new Error("Version 99 not found for key cnh-agent"));
    const req = new Request("http://t", {
      method: "POST",
      body: JSON.stringify({ version: 99 }),
    });
    const res = await POST(req, { params: Promise.resolve({ key: "cnh-agent" }) });
    expect(res.status).toBe(409);
  });

  it("returns 400 for invalid body (non-number version)", async () => {
    const req = new Request("http://t", {
      method: "POST",
      body: JSON.stringify({ version: "not-a-number" }),
    });
    const res = await POST(req, { params: Promise.resolve({ key: "cnh-agent" }) });
    expect(res.status).toBe(400);
  });

  it("returns 400 for non-positive version", async () => {
    const req = new Request("http://t", {
      method: "POST",
      body: JSON.stringify({ version: 0 }),
    });
    const res = await POST(req, { params: Promise.resolve({ key: "cnh-agent" }) });
    expect(res.status).toBe(400);
  });

  it("returns 404 for unknown key", async () => {
    const req = new Request("http://t", {
      method: "POST",
      body: JSON.stringify({ version: 1 }),
    });
    const res = await POST(req, { params: Promise.resolve({ key: "foo" }) });
    expect(res.status).toBe(404);
  });

  it("returns 500 for other unexpected errors", async () => {
    mockedActivate.mockRejectedValue(new Error("database connection lost"));
    const req = new Request("http://t", {
      method: "POST",
      body: JSON.stringify({ version: 3 }),
    });
    const res = await POST(req, { params: Promise.resolve({ key: "cnh-agent" }) });
    expect(res.status).toBe(500);
  });
});
