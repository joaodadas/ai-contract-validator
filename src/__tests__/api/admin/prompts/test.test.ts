import { POST } from "@/app/api/admin/prompts/[key]/test/route";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { runCnhAgent } from "@/ai/agents/cnh-agent/agent";
import * as cvcrmClient from "@/lib/cvcrm/client";
import * as docDownloader from "@/lib/cvcrm/documentDownloader";
import * as docMapper from "@/ai/orchestrator/agentDocumentMapper";

jest.mock("@/lib/auth/requireAdmin");
jest.mock("@/ai/agents/cnh-agent/agent");
jest.mock("@/lib/cvcrm/client");
jest.mock("@/lib/cvcrm/documentDownloader");
jest.mock("@/ai/orchestrator/agentDocumentMapper");

const mockedAdmin = requireAdmin as jest.MockedFunction<typeof requireAdmin>;
const mockedCnh = runCnhAgent as jest.MockedFunction<typeof runCnhAgent>;
const mockedFetchReserva = cvcrmClient.fetchReserva as jest.MockedFunction<typeof cvcrmClient.fetchReserva>;
const mockedFetchDocs = cvcrmClient.fetchDocumentos as jest.MockedFunction<typeof cvcrmClient.fetchDocumentos>;
const mockedDownload = docDownloader.downloadAllDocuments as jest.MockedFunction<typeof docDownloader.downloadAllDocuments>;
const mockedMap = docMapper.mapDocumentsToAgents as jest.MockedFunction<typeof docMapper.mapDocumentsToAgents>;

function makeMap(agentKey: string) {
  const m = new Map();
  m.set(agentKey, [{ data: Buffer.from("x"), mimeType: "application/pdf", nome: "cnh.pdf" }]);
  return m;
}

describe("POST /api/admin/prompts/[key]/test", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAdmin.mockResolvedValue({ id: 1, role: "admin" } as never);
    mockedFetchReserva.mockResolvedValue({ idreserva: 123, reserva: {} } as never);
    mockedFetchDocs.mockResolvedValue([] as never);
    mockedDownload.mockResolvedValue([{ data: Buffer.from("x"), mimeType: "application/pdf", nome: "cnh.pdf" }] as never);
    mockedMap.mockReturnValue(makeMap("cnh-agent"));
    mockedCnh.mockResolvedValue({
      agent: "cnh-agent",
      ok: true,
      data: { output: { nome: "X" } } as never,
      raw: "{...}",
      attempts: 1,
      provider: "google",
      model: "gemini-2.5-pro",
      promptVersion: "draft",
    } as never);
  });

  it("runs the draft prompt against the real reserva and returns output", async () => {
    const req = new Request("http://t", {
      method: "POST",
      body: JSON.stringify({ content: "DRAFT CNH", idReserva: 123 }),
    });
    const res = await POST(req, { params: Promise.resolve({ key: "cnh-agent" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.output).toEqual({ output: { nome: "X" } });
    expect(body.latencyMs).toBeGreaterThanOrEqual(0);
    const callOptions = mockedCnh.mock.calls[0]![1]!;
    expect(callOptions.promptOverride?.content).toContain("DRAFT CNH");
  });

  it("returns 400 when body is invalid (non-number idReserva)", async () => {
    const req = new Request("http://t", {
      method: "POST",
      body: JSON.stringify({ content: "DRAFT", idReserva: "nope" }),
    });
    const res = await POST(req, { params: Promise.resolve({ key: "cnh-agent" }) });
    expect(res.status).toBe(400);
  });

  it("returns 400 when content is empty", async () => {
    const req = new Request("http://t", {
      method: "POST",
      body: JSON.stringify({ content: "", idReserva: 123 }),
    });
    const res = await POST(req, { params: Promise.resolve({ key: "cnh-agent" }) });
    expect(res.status).toBe(400);
  });

  it("requires targetAgent when key is extraction-base", async () => {
    const req = new Request("http://t", {
      method: "POST",
      body: JSON.stringify({ content: "NEW BASE", idReserva: 123 }),
    });
    const res = await POST(req, { params: Promise.resolve({ key: "extraction-base" }) });
    expect(res.status).toBe(400);
  });

  it("returns 422 when the reservation has no documents for the target agent", async () => {
    mockedMap.mockReturnValue(new Map()); // empty map
    const req = new Request("http://t", {
      method: "POST",
      body: JSON.stringify({ content: "DRAFT", idReserva: 123 }),
    });
    const res = await POST(req, { params: Promise.resolve({ key: "cnh-agent" }) });
    expect(res.status).toBe(422);
  });

  it("returns 404 for unknown key", async () => {
    const req = new Request("http://t", {
      method: "POST",
      body: JSON.stringify({ content: "DRAFT", idReserva: 123 }),
    });
    const res = await POST(req, { params: Promise.resolve({ key: "foo" }) });
    expect(res.status).toBe(404);
  });
});
