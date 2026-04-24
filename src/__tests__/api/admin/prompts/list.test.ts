import { GET } from "@/app/api/admin/prompts/route";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { listPromptConfigs } from "@/db/queries/prompt-configs";

jest.mock("@/lib/auth/requireAdmin");
jest.mock("@/db/queries/prompt-configs");

const mockedRequireAdmin = requireAdmin as jest.MockedFunction<typeof requireAdmin>;
const mockedList = listPromptConfigs as jest.MockedFunction<typeof listPromptConfigs>;

describe("GET /api/admin/prompts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedRequireAdmin.mockResolvedValue({ id: 1, role: "admin" } as never);
  });

  it("returns 200 and 14 entries, even when DB has only partial data", async () => {
    mockedList.mockResolvedValue([
      { key: "cnh-agent", activeVersion: 3, totalVersions: 5, lastEditedAt: new Date("2026-04-20"), lastEditedBy: 1 },
    ]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.prompts).toHaveLength(14);
    const cnh = body.prompts.find((p: { key: string }) => p.key === "cnh-agent");
    expect(cnh.activeVersion).toBe(3);
    expect(cnh.totalVersions).toBe(5);
    expect(cnh.label).toBe("CNH");
    expect(cnh.critical).toBe(false);
  });

  it("marks extraction-base with null activeVersion when absent from DB", async () => {
    mockedList.mockResolvedValue([]);
    const res = await GET();
    const body = await res.json();
    const base = body.prompts.find((p: { key: string }) => p.key === "extraction-base");
    expect(base.activeVersion).toBeNull();
    expect(base.totalVersions).toBe(0);
    expect(base.label).toContain("Prompt Principal");
    expect(base.critical).toBe(false);
  });

  it("marks quadro-resumo-agent and fluxo-agent as critical", async () => {
    mockedList.mockResolvedValue([]);
    const res = await GET();
    const body = await res.json();
    const quadro = body.prompts.find((p: { key: string }) => p.key === "quadro-resumo-agent");
    const fluxo = body.prompts.find((p: { key: string }) => p.key === "fluxo-agent");
    expect(quadro.critical).toBe(true);
    expect(fluxo.critical).toBe(true);
  });

  it("calls requireAdmin before listing", async () => {
    mockedList.mockResolvedValue([]);
    await GET();
    expect(mockedRequireAdmin).toHaveBeenCalledTimes(1);
  });
});
