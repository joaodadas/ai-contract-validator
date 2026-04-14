import type { AgentResult, AgentName } from "@/ai/_base/types";
import type { FluxoOutput } from "@/ai/agents/fluxo-agent/schema";
import type { QuadroResumoOutput } from "@/ai/agents/quadro-resumo-agent/schema";
import type { DocumentContent } from "@/lib/cvcrm/documentDownloader";

// ---------------------------------------------------------------------------
// Mock all 14 agent modules + validation-agent
// ---------------------------------------------------------------------------
jest.mock("@/ai/agents/cnh-agent/agent", () => ({
  runCnhAgent: jest.fn(),
}));
jest.mock("@/ai/agents/rgcpf-agent/agent", () => ({
  runRgcpfAgent: jest.fn(),
}));
jest.mock("@/ai/agents/ato-agent/agent", () => ({
  runAtoAgent: jest.fn(),
}));
jest.mock("@/ai/agents/quadro-resumo-agent/agent", () => ({
  runQuadroResumoAgent: jest.fn(),
}));
jest.mock("@/ai/agents/fluxo-agent/agent", () => ({
  runFluxoAgent: jest.fn(),
}));
jest.mock("@/ai/agents/planta-agent/agent", () => ({
  runPlantaAgent: jest.fn(),
}));
jest.mock("@/ai/agents/comprovante-residencia-agent/agent", () => ({
  runComprovanteResidenciaAgent: jest.fn(),
}));
jest.mock("@/ai/agents/declaracao-residencia-agent/agent", () => ({
  runDeclaracaoResidenciaAgent: jest.fn(),
}));
jest.mock("@/ai/agents/certidao-estado-civil-agent/agent", () => ({
  runCertidaoEstadoCivilAgent: jest.fn(),
}));
jest.mock("@/ai/agents/termo-agent/agent", () => ({
  runTermoAgent: jest.fn(),
}));
jest.mock("@/ai/agents/carteira-trabalho-agent/agent", () => ({
  runCarteiraTrabalhoAgent: jest.fn(),
}));
jest.mock("@/ai/agents/comprovante-renda-agent/agent", () => ({
  runComprovanteRendaAgent: jest.fn(),
}));
jest.mock("@/ai/agents/carta-fiador-agent/agent", () => ({
  runCartaFiadorAgent: jest.fn(),
}));
jest.mock("@/ai/agents/validation-agent/agent", () => ({
  runValidationAgent: jest.fn(),
}));

// Mock report-formatter so analyzeContract tests stay isolated
jest.mock("@/ai/validation/report-formatter", () => ({
  formatValidationReport: jest.fn(() => "Mocked report"),
}));

// Import the module under test AFTER jest.mock declarations
import {
  runFinancialComparison,
  runPlantaValidation,
  runExtraction,
  analyzeContract,
} from "@/ai/orchestrator/contractOrchestrator";

// Import mocked agents for configuring return values
import { runFluxoAgent } from "@/ai/agents/fluxo-agent/agent";
import { runQuadroResumoAgent } from "@/ai/agents/quadro-resumo-agent/agent";
import { runPlantaAgent } from "@/ai/agents/planta-agent/agent";
import { runCnhAgent } from "@/ai/agents/cnh-agent/agent";
import { runRgcpfAgent } from "@/ai/agents/rgcpf-agent/agent";
import { runAtoAgent } from "@/ai/agents/ato-agent/agent";
import { runComprovanteResidenciaAgent } from "@/ai/agents/comprovante-residencia-agent/agent";
import { runDeclaracaoResidenciaAgent } from "@/ai/agents/declaracao-residencia-agent/agent";
import { runCertidaoEstadoCivilAgent } from "@/ai/agents/certidao-estado-civil-agent/agent";
import { runTermoAgent } from "@/ai/agents/termo-agent/agent";
import { runCarteiraTrabalhoAgent } from "@/ai/agents/carteira-trabalho-agent/agent";
import { runComprovanteRendaAgent } from "@/ai/agents/comprovante-renda-agent/agent";
import { runCartaFiadorAgent } from "@/ai/agents/carta-fiador-agent/agent";
import { runValidationAgent } from "@/ai/agents/validation-agent/agent";
import { formatValidationReport } from "@/ai/validation/report-formatter";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFluxoResult(
  overrides: Partial<AgentResult<FluxoOutput>> = {},
): AgentResult<FluxoOutput> {
  return {
    agent: "fluxo-agent",
    ok: true,
    data: {
      document_type: "Fluxo",
      schema_version: "3.0",
      output: {
        dados_cadastrais: {
          empreendimento: "Kentucky",
          unidade: "22718",
          bloco: "BLOCO 11",
          titulares: [{ nome: "Joao", cpf: "00000000000", score: 750 }],
        },
        financeiro: {
          valor_venda_total: 246800,
          sinal_ato: 500,
          financiamento_bancario: 181955.89,
          subsidio: 1693,
          subsidio_outros: 20000,
          parcelas_mensais: [
            {
              nome_grupo: "G1",
              qtd_parcelas: 8,
              valor_parcela: 1377.37,
              valor_total_grupo: 11018.96,
              data_inicio: "2026-04-30",
              data_fim: "2026-11-30",
            },
          ],
          reforcos_anuais: [
            {
              descricao: "Balao",
              valor: 2750,
              data_vencimento: "2026-12-20",
            },
          ],
          chaves: { valor: 2749.96, data_vencimento: "2027-10-20" },
          pos_chaves: [
            {
              nome_grupo: "PC",
              qtd_parcelas: 36,
              valor_parcela: 277.78,
              valor_total_grupo: 10000.08,
              data_inicio: "2028-03-30",
              data_fim: "2031-02-28",
            },
          ],
        },
      },
    },
    provider: "google",
    model: "gemini-2.5-flash",
    attempts: 1,
    ...overrides,
  };
}

function makeQuadroResult(
  overrides: Partial<AgentResult<QuadroResumoOutput>> = {},
): AgentResult<QuadroResumoOutput> {
  return {
    agent: "quadro-resumo-agent",
    ok: true,
    data: {
      document_type: "QuadroResumo",
      schema_version: "2.0",
      output: {
        imovel: {
          empreendimento: "Kentucky",
          unidade: "22718",
          bloco: "BLOCO 11",
        },
        compradores: [
          {
            nome: "Joao",
            cpf: "000.000.000-00",
            tipo: "Titular",
            renda: 5000,
            ocupacao: "Engenheiro",
            estado_civil: "Solteiro",
            endereco: "",
            bairro: "",
            cidade: "",
            estado: "",
            cep: "",
            telefone: "",
            rg: "",
            nacionalidade: "",
          },
        ],
        financeiro: {
          valor_venda_total: 246800,
          sinal_ato: 500,
          financiamento_bancario: 183648.89,
          subsidio_total: 20000,
          parcelas_mensais: [
            {
              nome_grupo: "G1",
              qtd_parcelas: 8,
              valor_parcela: 1377.37,
              valor_total_grupo: 11018.96,
              data_inicio: "2026-04-30",
              data_fim: "2026-11-30",
            },
          ],
          reforcos_anuais: [
            {
              descricao: "Balao",
              valor: 2750,
              data_vencimento: "2026-12-20",
            },
          ],
          chaves: { valor: 2749.96, vencimento: "2027-10-20" },
          pos_chaves: [
            {
              nome_grupo: "PC",
              qtd_parcelas: 36,
              valor_parcela: 277.78,
              valor_total_grupo: 10000.08,
              data_inicio: "2028-03-30",
              data_fim: "2031-02-28",
            },
          ],
          data_entrega_imovel: "2027-10-20",
        },
      },
    },
    provider: "google",
    model: "gemini-2.5-flash",
    attempts: 1,
    ...overrides,
  };
}

function makePlantaResult(
  overrides: Partial<AgentResult<unknown>> = {},
): AgentResult<unknown> {
  return {
    agent: "planta-agent",
    ok: true,
    data: {
      output: [{ bloco: "BLOCO 11", apto: "AP 108" }],
    },
    provider: "google",
    model: "gemini-2.5-flash",
    attempts: 1,
    ...overrides,
  };
}

function makeDocContent(
  agentName: string,
  overrides: Partial<DocumentContent> = {},
): DocumentContent {
  return {
    documentId: 1,
    nome: `${agentName}-doc`,
    tipo: agentName,
    contentType: "text",
    text: "Test document content",
    link: `https://example.com/${agentName}`,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("contractOrchestrator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // runFinancialComparison (deterministic — no mocking needed)
  // =========================================================================
  describe("runFinancialComparison", () => {
    it("detects divergences with Kentucky 22718 data (financiamento diff = 1693, subsidio diff)", () => {
      const results: AgentResult<unknown>[] = [
        makeFluxoResult(),
        makeQuadroResult(),
      ];

      const comparison = runFinancialComparison(results);

      expect(comparison).toBeDefined();
      expect(comparison!.status_geral).toContain("DIVERG");

      // financiamento: fluxo 181955.89 vs quadro 183648.89 => diff = -1693.00
      expect(comparison!.todos_resultados.financiamento.status).toBe("DIVERGENTE");
      expect(comparison!.todos_resultados.financiamento.fluxo).toBe("181955.89");
      expect(comparison!.todos_resultados.financiamento.quadro).toBe("183648.89");
      expect(comparison!.todos_resultados.financiamento.diferenca).toBe("-1693.00");
      expect(comparison!.divergencias).toHaveProperty("financiamento");

      // subsidio: fluxo = 1693 + 20000 = 21693, quadro = 20000 => diff = 1693
      expect(comparison!.todos_resultados.subsidio.status).toBe("DIVERGENTE");
      expect(comparison!.todos_resultados.subsidio.fluxo).toBe("21693.00");
      expect(comparison!.todos_resultados.subsidio.quadro).toBe("20000.00");
      expect(comparison!.divergencias).toHaveProperty("subsidio");

      // Other items should match
      expect(comparison!.todos_resultados.valor_venda_total.status).toBe("OK");
      expect(comparison!.todos_resultados.sinal_ato.status).toBe("OK");
      expect(comparison!.todos_resultados.parcelas_mensais.status).toBe("OK");
      expect(comparison!.todos_resultados.reforcos_anuais.status).toBe("OK");
      expect(comparison!.todos_resultados.chaves.status).toBe("OK");
      expect(comparison!.todos_resultados.pos_chaves.status).toBe("OK");
    });

    it("returns undefined when fluxo-agent result is missing", () => {
      const results: AgentResult<unknown>[] = [makeQuadroResult()];

      const comparison = runFinancialComparison(results);

      expect(comparison).toBeUndefined();
    });

    it("returns undefined when quadro-resumo-agent result is missing", () => {
      const results: AgentResult<unknown>[] = [makeFluxoResult()];

      const comparison = runFinancialComparison(results);

      expect(comparison).toBeUndefined();
    });

    it("returns undefined when fluxo-agent result has ok:false", () => {
      const results: AgentResult<unknown>[] = [
        makeFluxoResult({ ok: false, data: undefined, error: "LLM parse error" }),
        makeQuadroResult(),
      ];

      const comparison = runFinancialComparison(results);

      expect(comparison).toBeUndefined();
    });

    it("returns undefined when quadro-resumo-agent result has ok:false", () => {
      const results: AgentResult<unknown>[] = [
        makeFluxoResult(),
        makeQuadroResult({ ok: false, data: undefined, error: "LLM timeout" }),
      ];

      const comparison = runFinancialComparison(results);

      expect(comparison).toBeUndefined();
    });

    it("returns undefined when fluxo-agent result has no data", () => {
      const results: AgentResult<unknown>[] = [
        makeFluxoResult({ ok: true, data: undefined }),
        makeQuadroResult(),
      ];

      const comparison = runFinancialComparison(results);

      expect(comparison).toBeUndefined();
    });
  });

  // =========================================================================
  // runPlantaValidation (deterministic — no mocking needed)
  // =========================================================================
  describe("runPlantaValidation", () => {
    it("returns 'Igual' when planta matches reserva", () => {
      const results: AgentResult<unknown>[] = [makePlantaResult()];
      const reservaPlanta = { bloco: "BLOCO 11", numero: "AP 108" };

      const validation = runPlantaValidation(results, reservaPlanta);

      expect(validation).toBeDefined();
      expect(validation!.status).toBe("Igual");
      expect(validation!.mensagem).toContain("Sucesso");
    });

    it("returns undefined when reservaPlanta is undefined", () => {
      const results: AgentResult<unknown>[] = [makePlantaResult()];

      const validation = runPlantaValidation(results, undefined);

      expect(validation).toBeUndefined();
    });

    it("returns 'Atencao' when planta-agent result is missing from extraction results", () => {
      const results: AgentResult<unknown>[] = [makeFluxoResult()];
      const reservaPlanta = { bloco: "BLOCO 11", numero: "AP 108" };

      const validation = runPlantaValidation(results, reservaPlanta);

      expect(validation).toBeDefined();
      expect(validation!.status).toBe("Atenção");
      expect(validation!.mensagem).toContain("Planta");
    });

    it("returns 'Atencao' when planta-agent has ok:false", () => {
      const results: AgentResult<unknown>[] = [
        makePlantaResult({ ok: false, data: undefined, error: "Parse error" }),
      ];
      const reservaPlanta = { bloco: "BLOCO 11", numero: "AP 108" };

      const validation = runPlantaValidation(results, reservaPlanta);

      expect(validation).toBeDefined();
      expect(validation!.status).toBe("Atenção");
    });

    it("returns 'Atencao' when planta-agent output array is empty", () => {
      const results: AgentResult<unknown>[] = [
        makePlantaResult({ data: { output: [] } }),
      ];
      const reservaPlanta = { bloco: "BLOCO 11", numero: "AP 108" };

      const validation = runPlantaValidation(results, reservaPlanta);

      expect(validation).toBeDefined();
      expect(validation!.status).toBe("Atenção");
    });

    it("returns 'Diferente' when planta bloco does not match reserva", () => {
      const results: AgentResult<unknown>[] = [
        makePlantaResult({
          data: { output: [{ bloco: "BLOCO 99", apto: "AP 108" }] },
        }),
      ];
      const reservaPlanta = { bloco: "BLOCO 11", numero: "AP 108" };

      const validation = runPlantaValidation(results, reservaPlanta);

      expect(validation).toBeDefined();
      expect(validation!.status).toBe("Diferente");
      expect(validation!.mensagem).toContain("divergentes");
    });
  });

  // =========================================================================
  // runExtraction (needs agent mocks)
  // =========================================================================
  describe("runExtraction", () => {
    it("runs only agents whose keys are present in the map", async () => {
      const fluxoDoc = makeDocContent("fluxo-agent");
      const documentMap = new Map<string, DocumentContent[]>();
      documentMap.set("fluxo-agent", [fluxoDoc]);

      const mockFluxoResult = makeFluxoResult();
      (runFluxoAgent as jest.Mock).mockResolvedValue(mockFluxoResult);

      const results = await runExtraction(documentMap, "{}");

      // Only fluxo-agent key is in the map — only 1 result
      expect(results).toHaveLength(1);

      const fluxoResult = results.find((r) => r.agent === "fluxo-agent");
      expect(fluxoResult).toBeDefined();
      expect(fluxoResult!.ok).toBe(true);
      expect(runFluxoAgent).toHaveBeenCalledTimes(1);
      expect(runCnhAgent).not.toHaveBeenCalled();
    });

    it("returns error result for unknown agent names in map keys", async () => {
      const documentMap = new Map<string, DocumentContent[]>();
      documentMap.set("unknown-agent", [makeDocContent("unknown-agent")]);

      const results = await runExtraction(documentMap, "{}");

      expect(results).toHaveLength(1);
      expect(results[0].ok).toBe(false);
      expect(results[0].error).toContain("Unknown agent");
      expect(results[0].agent).toBe("unknown-agent");
      expect(results[0].attempts).toBe(0);
    });

    it("runs all agents whose keys are present in the map", async () => {
      const documentMap = new Map<string, DocumentContent[]>();
      documentMap.set("fluxo-agent", [makeDocContent("fluxo-agent")]);
      documentMap.set("quadro-resumo-agent", [makeDocContent("quadro-resumo-agent")]);

      (runFluxoAgent as jest.Mock).mockResolvedValue(makeFluxoResult());
      (runQuadroResumoAgent as jest.Mock).mockResolvedValue(makeQuadroResult());

      const results = await runExtraction(documentMap, "{}");

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.ok)).toBe(true);
      expect(runFluxoAgent).toHaveBeenCalledTimes(1);
      expect(runQuadroResumoAgent).toHaveBeenCalledTimes(1);
    });

    it("parses composite keys and sets pessoa on result", async () => {
      const documentMap = new Map<string, DocumentContent[]>();
      documentMap.set("rgcpf-agent:titular", [makeDocContent("rgcpf-agent")]);
      documentMap.set("rgcpf-agent:conjuge", [makeDocContent("rgcpf-agent")]);

      const baseResult = {
        agent: "rgcpf-agent" as AgentName,
        ok: true,
        data: { output: { test: true } },
        provider: "google" as const,
        model: "gemini-2.5-flash",
        attempts: 1,
      };
      (runRgcpfAgent as jest.Mock).mockResolvedValue(baseResult);

      const results = await runExtraction(documentMap, "{}");

      expect(results).toHaveLength(2);
      expect(runRgcpfAgent).toHaveBeenCalledTimes(2);

      const titularResult = results.find((r) => r.pessoa === "titular");
      expect(titularResult).toBeDefined();
      expect(titularResult!.agent).toBe("rgcpf-agent");
      expect(titularResult!.ok).toBe(true);

      const conjugeResult = results.find((r) => r.pessoa === "conjuge");
      expect(conjugeResult).toBeDefined();
      expect(conjugeResult!.agent).toBe("rgcpf-agent");
    });

    it("sets pessoa to undefined for plain (non-composite) keys", async () => {
      const documentMap = new Map<string, DocumentContent[]>();
      documentMap.set("fluxo-agent", [makeDocContent("fluxo-agent")]);

      (runFluxoAgent as jest.Mock).mockResolvedValue(makeFluxoResult());

      const results = await runExtraction(documentMap, "{}");

      expect(results).toHaveLength(1);
      expect(results[0].pessoa).toBeUndefined();
    });
  });

  // =========================================================================
  // analyzeContract (full pipeline — needs all mocks)
  // =========================================================================
  describe("analyzeContract", () => {
    it("returns a complete ContractAnalysis with all agents succeeding", async () => {
      const documentMap = new Map<string, DocumentContent[]>();
      documentMap.set("fluxo-agent", [makeDocContent("fluxo-agent")]);
      documentMap.set("quadro-resumo-agent", [makeDocContent("quadro-resumo-agent")]);
      documentMap.set("planta-agent", [makeDocContent("planta-agent")]);

      (runFluxoAgent as jest.Mock).mockResolvedValue(makeFluxoResult());
      (runQuadroResumoAgent as jest.Mock).mockResolvedValue(makeQuadroResult());
      (runPlantaAgent as jest.Mock).mockResolvedValue(makePlantaResult());

      // Mock the validation agent for the cross-validation phase
      const mockValidationOutput = {
        dados_imovel: {
          nome_empreendimento: { status: "Igual", detalhes: "" },
          unidade_bloco: { status: "Igual", detalhes: "" },
        },
        financeiro: {
          valor_venda_total: { status: "Igual", detalhes: "" },
          financiamento: { status: "Divergente", detalhes: "Diff 1693" },
          subsidio: { status: "Divergente", detalhes: "Diff 1693" },
          parcelas_mensais: { status: "Igual", detalhes: "" },
          chaves: { status: "Igual", detalhes: "" },
          pos_chaves: { status: "Igual", detalhes: "" },
        },
        Termo: { status: "Ignorado", detalhes: "" },
        pessoas: [{ papel: "titular", status: "Igual", detalhes: "" }],
        validacao_endereco: { status: "Igual", detalhes: "" },
        Documentos: { status: "Igual", detalhes: "" },
      };

      (runValidationAgent as jest.Mock).mockResolvedValue({
        agent: "validation-agent",
        ok: true,
        data: mockValidationOutput,
        provider: "google",
        model: "gemini-2.5-pro",
        attempts: 1,
      });

      const reservaPlanta = { bloco: "BLOCO 11", numero: "AP 108" };

      const analysis = await analyzeContract(
        documentMap,
        "{}",
        undefined,
        reservaPlanta,
      );

      // Overall analysis structure
      expect(analysis.ok).toBe(true);
      expect(analysis.results).toBeDefined();
      // 3 extraction + 1 validation = 4
      expect(analysis.results.length).toBe(4);
      expect(analysis.summary).toBeDefined();

      // Financial comparison should have run
      expect(analysis.financialComparison).toBeDefined();
      expect(analysis.financialComparison!.status_geral).toContain("DIVERG");

      // Planta validation should have run
      expect(analysis.plantaValidation).toBeDefined();
      expect(analysis.plantaValidation!.status).toBe("Igual");

      // Validation output should be populated
      expect(analysis.validation).toBeDefined();
      expect(analysis.validation).toEqual(mockValidationOutput);

      // Formatted report should use the mocked formatter
      expect(analysis.formattedReport).toBe("Mocked report");
      expect(formatValidationReport).toHaveBeenCalledWith(mockValidationOutput);

      // Summary totals: fluxo value comes from the FluxoOutput
      expect(analysis.summary.totals.fluxo_valor_total).toBe(246800);
    });

    it("tracks failed_agents in summary when some agents fail", async () => {
      const documentMap = new Map<string, DocumentContent[]>();
      documentMap.set("fluxo-agent", [makeDocContent("fluxo-agent")]);
      documentMap.set("cnh-agent", [makeDocContent("cnh-agent")]);
      documentMap.set("rgcpf-agent", [makeDocContent("rgcpf-agent")]);

      (runFluxoAgent as jest.Mock).mockResolvedValue(makeFluxoResult());
      (runCnhAgent as jest.Mock).mockResolvedValue({
        agent: "cnh-agent",
        ok: false,
        error: "LLM parsing failed after 3 retries",
        attempts: 3,
      } as AgentResult<unknown>);
      (runRgcpfAgent as jest.Mock).mockResolvedValue({
        agent: "rgcpf-agent",
        ok: false,
        error: "Rate limit exceeded",
        attempts: 1,
      } as AgentResult<unknown>);

      // Validation agent for cross-validation phase
      (runValidationAgent as jest.Mock).mockResolvedValue({
        agent: "validation-agent",
        ok: false,
        error: "Insufficient data for validation",
        attempts: 1,
      });

      const analysis = await analyzeContract(documentMap, "{}");

      // At least one agent succeeded, so ok = true
      expect(analysis.ok).toBe(true);

      // Two agents failed
      expect(analysis.summary.failed_agents).toContain("cnh-agent");
      expect(analysis.summary.failed_agents).toContain("rgcpf-agent");
      expect(analysis.summary.failed_agents).toHaveLength(2);

      // Validation failed, so no validation output or report
      expect(analysis.validation).toBeUndefined();
      expect(analysis.formattedReport).toBeUndefined();
    });

    it("handles validation-agent throwing an error gracefully", async () => {
      const documentMap = new Map<string, DocumentContent[]>();
      documentMap.set("fluxo-agent", [makeDocContent("fluxo-agent")]);

      (runFluxoAgent as jest.Mock).mockResolvedValue(makeFluxoResult());

      // Validation agent throws
      (runValidationAgent as jest.Mock).mockRejectedValue(
        new Error("Network timeout"),
      );

      const analysis = await analyzeContract(documentMap, "{}");

      // Pipeline should still complete
      expect(analysis.ok).toBe(true);
      expect(analysis.results).toHaveLength(1); // Only extraction results
      expect(analysis.validation).toBeUndefined();
      expect(analysis.formattedReport).toBeUndefined();
    });

    it("sets ok to false when all agents fail", async () => {
      const documentMap = new Map<string, DocumentContent[]>();
      documentMap.set("fluxo-agent", [makeDocContent("fluxo-agent")]);

      (runFluxoAgent as jest.Mock).mockResolvedValue({
        agent: "fluxo-agent",
        ok: false,
        error: "Complete failure",
        attempts: 3,
      } as AgentResult<unknown>);

      (runValidationAgent as jest.Mock).mockResolvedValue({
        agent: "validation-agent",
        ok: false,
        error: "No data to validate",
        attempts: 1,
      });

      const analysis = await analyzeContract(documentMap, "{}");

      expect(analysis.ok).toBe(false);
      expect(analysis.summary.failed_agents).toContain("fluxo-agent");
      expect(analysis.financialComparison).toBeUndefined();
    });

    it("populates ato_valor_total in summary when ato-agent succeeds", async () => {
      const documentMap = new Map<string, DocumentContent[]>();
      documentMap.set("ato-agent", [makeDocContent("ato-agent")]);

      (runAtoAgent as jest.Mock).mockResolvedValue({
        agent: "ato-agent",
        ok: true,
        data: { output: { valor_total: 500 } },
        provider: "google",
        model: "gemini-2.5-flash",
        attempts: 1,
      } as AgentResult<unknown>);

      (runValidationAgent as jest.Mock).mockResolvedValue({
        agent: "validation-agent",
        ok: false,
        error: "Insufficient data",
        attempts: 1,
      });

      const analysis = await analyzeContract(documentMap, "{}");

      expect(analysis.summary.totals.ato_valor_total).toBe(500);
    });
  });
});
