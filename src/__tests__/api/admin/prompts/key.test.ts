import { GET, POST } from "@/app/api/admin/prompts/[key]/route";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getPromptByKey, createDraft } from "@/db/queries/prompt-configs";

jest.mock("@/lib/auth/requireAdmin");
jest.mock("@/db/queries/prompt-configs");

const mockedAdmin = requireAdmin as jest.MockedFunction<typeof requireAdmin>;
const mockedGet = getPromptByKey as jest.MockedFunction<typeof getPromptByKey>;
const mockedCreate = createDraft as jest.MockedFunction<typeof createDraft>;

describe("GET/POST /api/admin/prompts/[key]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAdmin.mockResolvedValue({ id: 1, role: "admin" } as never);
  });

  describe("GET", () => {
    it("returns 404 for unknown key", async () => {
      const req = new Request("http://t/api/admin/prompts/foo");
      const res = await GET(req, { params: Promise.resolve({ key: "foo" }) });
      expect(res.status).toBe(404);
    });

    it("returns 200 with versions and active for a valid key", async () => {
      const now = new Date();
      mockedGet.mockResolvedValue({
        versions: [
          { id: "a", agent: "cnh-agent", version: 1, content: "...", isActive: true, isDefault: true, createdAt: now } as never,
        ],
        active: { id: "a", agent: "cnh-agent", version: 1, content: "...", isActive: true, isDefault: true, createdAt: now } as never,
      });
      const req = new Request("http://t/api/admin/prompts/cnh-agent");
      const res = await GET(req, { params: Promise.resolve({ key: "cnh-agent" }) });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.versions).toHaveLength(1);
      expect(body.active.version).toBe(1);
    });
  });

  describe("POST", () => {
    it("creates a draft when body is valid", async () => {
      mockedCreate.mockResolvedValue({ id: "x", agent: "cnh-agent", version: 2, isActive: false } as never);
      const req = new Request("http://t/api/admin/prompts/cnh-agent", {
        method: "POST",
        body: JSON.stringify({ content: "NEW PROMPT", notes: "test" }),
      });
      const res = await POST(req, { params: Promise.resolve({ key: "cnh-agent" }) });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.version).toBe(2);
      expect(mockedCreate).toHaveBeenCalledWith({
        key: "cnh-agent",
        content: "NEW PROMPT",
        notes: "test",
        createdBy: 1,
      });
    });

    it("returns 400 for empty content", async () => {
      const req = new Request("http://t/api/admin/prompts/cnh-agent", {
        method: "POST",
        body: JSON.stringify({ content: "" }),
      });
      const res = await POST(req, { params: Promise.resolve({ key: "cnh-agent" }) });
      expect(res.status).toBe(400);
    });

    it("returns 400 when content exceeds 50000 chars", async () => {
      const req = new Request("http://t/api/admin/prompts/cnh-agent", {
        method: "POST",
        body: JSON.stringify({ content: "a".repeat(50001) }),
      });
      const res = await POST(req, { params: Promise.resolve({ key: "cnh-agent" }) });
      expect(res.status).toBe(400);
    });

    it("returns 404 for unknown key", async () => {
      const req = new Request("http://t/api/admin/prompts/foo", {
        method: "POST",
        body: JSON.stringify({ content: "NEW" }),
      });
      const res = await POST(req, { params: Promise.resolve({ key: "foo" }) });
      expect(res.status).toBe(404);
    });

    it("returns 400 when body is not valid JSON", async () => {
      const req = new Request("http://t/api/admin/prompts/cnh-agent", {
        method: "POST",
        body: "not json",
      });
      const res = await POST(req, { params: Promise.resolve({ key: "cnh-agent" }) });
      expect(res.status).toBe(400);
    });
  });
});
