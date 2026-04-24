/* eslint-disable @typescript-eslint/no-explicit-any */
import * as loadPromptModule from "@/ai/_base/loadPrompt";

jest.mock("@/ai/_base/loadPrompt");

// Mock the extraction agent to capture the options it was called with
jest.mock("@/ai/agents/cnh-agent/agent", () => ({
  runCnhAgent: jest.fn(),
}));

// Mock validation-agent so analyzeContract Phase 4 doesn't hang
jest.mock("@/ai/agents/validation-agent/agent", () => ({
  runValidationAgent: jest.fn(),
}));

// Mock report-formatter
jest.mock("@/ai/validation/report-formatter", () => ({
  formatValidationReport: jest.fn(() => "Mocked report"),
}));

const { analyzeContract } = require("@/ai/orchestrator/contractOrchestrator");
const { runCnhAgent } = jest.requireMock("@/ai/agents/cnh-agent/agent") as {
  runCnhAgent: jest.Mock;
};
const { runValidationAgent } = jest.requireMock("@/ai/agents/validation-agent/agent") as {
  runValidationAgent: jest.Mock;
};
const mockedSnapshot = loadPromptModule.snapshotPrompts as jest.MockedFunction<
  typeof loadPromptModule.snapshotPrompts
>;

function makeSnapshotMock() {
  return Object.freeze({
    "extraction-base": Object.freeze({ content: "BASE-V3", version: 3 }),
    "cnh-agent": Object.freeze({ content: "CNH-V5", version: 5 }),
    "rgcpf-agent": Object.freeze({ content: "", version: 1 }),
    "ato-agent": Object.freeze({ content: "", version: 1 }),
    "quadro-resumo-agent": Object.freeze({ content: "", version: 1 }),
    "fluxo-agent": Object.freeze({ content: "", version: 1 }),
    "planta-agent": Object.freeze({ content: "", version: 1 }),
    "comprovante-residencia-agent": Object.freeze({ content: "", version: 1 }),
    "declaracao-residencia-agent": Object.freeze({ content: "", version: 1 }),
    "certidao-estado-civil-agent": Object.freeze({ content: "", version: 1 }),
    "termo-agent": Object.freeze({ content: "", version: 1 }),
    "carteira-trabalho-agent": Object.freeze({ content: "", version: 1 }),
    "comprovante-renda-agent": Object.freeze({ content: "", version: 1 }),
    "carta-fiador-agent": Object.freeze({ content: "", version: 1 }),
  }) as any;
}

describe("analyzeContract — prompt snapshot wiring", () => {
  beforeEach(() => {
    mockedSnapshot.mockResolvedValue(makeSnapshotMock());
    runCnhAgent.mockResolvedValue({
      agent: "cnh-agent",
      ok: true,
      data: { output: {} },
      attempts: 1,
      promptVersion: "base:v3|cnh-agent:v5",
    });
    runValidationAgent.mockResolvedValue({
      agent: "validation-agent",
      ok: false,
      error: "No data",
      attempts: 1,
    });
  });

  afterEach(() => {
    mockedSnapshot.mockClear();
    runCnhAgent.mockClear();
    runValidationAgent.mockClear();
  });

  it("calls snapshotPrompts exactly once per analyzeContract run", async () => {
    const docMap = new Map();
    docMap.set("cnh-agent", [{ data: Buffer.from("pdf"), mimeType: "application/pdf", nome: "cnh.pdf" }]);
    await analyzeContract(docMap, "{}");
    expect(mockedSnapshot).toHaveBeenCalledTimes(1);
  });

  it("passes a composite promptOverride to the agent runner", async () => {
    const docMap = new Map();
    docMap.set("cnh-agent", [{ data: Buffer.from("pdf"), mimeType: "application/pdf", nome: "cnh.pdf" }]);
    await analyzeContract(docMap, "{}");
    const [, agentOptions] = runCnhAgent.mock.calls[0]!;
    expect(agentOptions.promptOverride).toEqual({
      content: "BASE-V3\n\nCNH-V5",
      version: "base:v3|cnh-agent:v5",
    });
  });
});
