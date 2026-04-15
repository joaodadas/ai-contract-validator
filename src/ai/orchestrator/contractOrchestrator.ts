import type {
  AgentName,
  AgentInput,
  AgentRunOptions,
  AgentResult,
} from "@/ai/_base/types";
import { runCnhAgent } from "@/ai/agents/cnh-agent/agent";
import { runRgcpfAgent } from "@/ai/agents/rgcpf-agent/agent";
import { runAtoAgent } from "@/ai/agents/ato-agent/agent";
import { runQuadroResumoAgent } from "@/ai/agents/quadro-resumo-agent/agent";
import { runFluxoAgent } from "@/ai/agents/fluxo-agent/agent";
import { runPlantaAgent } from "@/ai/agents/planta-agent/agent";
import { runComprovanteResidenciaAgent } from "@/ai/agents/comprovante-residencia-agent/agent";
import { runDeclaracaoResidenciaAgent } from "@/ai/agents/declaracao-residencia-agent/agent";
import { runCertidaoEstadoCivilAgent } from "@/ai/agents/certidao-estado-civil-agent/agent";
import { runTermoAgent } from "@/ai/agents/termo-agent/agent";
import { runCarteiraTrabalhoAgent } from "@/ai/agents/carteira-trabalho-agent/agent";
import { runComprovanteRendaAgent } from "@/ai/agents/comprovante-renda-agent/agent";
import { runCartaFiadorAgent } from "@/ai/agents/carta-fiador-agent/agent";
import { runValidationAgent } from "@/ai/agents/validation-agent/agent";
import type { ValidationOutput } from "@/ai/agents/validation-agent/schema";
import type { FluxoOutput } from "@/ai/agents/fluxo-agent/schema";
import type { QuadroResumoOutput } from "@/ai/agents/quadro-resumo-agent/schema";
import { compareFinancials, type FinancialComparisonResult } from "@/ai/validation/financial-comparison";
import { validatePlanta, type PlantaValidationResult } from "@/ai/validation/planta-validation";
import { formatValidationReport } from "@/ai/validation/report-formatter";
import type { DocumentContent } from "@/lib/cvcrm/documentDownloader";
import { buildAgentInput } from "./agentDocumentMapper";
import { resolveAgentOptions } from "./agentModelConfig";

type ExtractorRunner = (input: AgentInput, options?: AgentRunOptions) => Promise<AgentResult<unknown>>;

const EXTRACTION_AGENTS: Record<string, ExtractorRunner> = {
  "cnh-agent": runCnhAgent,
  "rgcpf-agent": runRgcpfAgent,
  "ato-agent": runAtoAgent,
  "quadro-resumo-agent": runQuadroResumoAgent,
  "fluxo-agent": runFluxoAgent,
  "planta-agent": runPlantaAgent,
  "comprovante-residencia-agent": runComprovanteResidenciaAgent,
  "declaracao-residencia-agent": runDeclaracaoResidenciaAgent,
  "certidao-estado-civil-agent": runCertidaoEstadoCivilAgent,
  "termo-agent": runTermoAgent,
  "carteira-trabalho-agent": runCarteiraTrabalhoAgent,
  "comprovante-renda-agent": runComprovanteRendaAgent,
  "carta-fiador-agent": runCartaFiadorAgent,
  "validation-agent": runValidationAgent as ExtractorRunner,
};


export type ContractAnalysis = {
  ok: boolean;
  results: AgentResult<unknown>[];
  summary: {
    failed_agents: AgentName[];
    totals: {
      fluxo_valor_total?: number;
      ato_valor_total?: number;
    };
  };
  financialComparison?: FinancialComparisonResult;
  plantaValidation?: PlantaValidationResult;
  validation?: ValidationOutput;
  formattedReport?: string;
};

/**
 * Phase 1: Run extraction agents in parallel.
 * Parses composite keys (e.g. "rgcpf-agent:titular") to run person agents
 * separately per person group.
 */
export async function runExtraction(
  documentMap: Map<string, DocumentContent[]>,
  contextJson: string,
  options?: AgentRunOptions,
): Promise<AgentResult<unknown>[]> {
  const keys = Array.from(documentMap.keys());

  return Promise.all(
    keys.map((key) => {
      const colonIndex = key.indexOf(":");
      const agentName = (colonIndex >= 0 ? key.substring(0, colonIndex) : key) as AgentName;
      const pessoa = colonIndex >= 0 ? key.substring(colonIndex + 1) : undefined;

      const runner = EXTRACTION_AGENTS[agentName];
      if (!runner) {
        return Promise.resolve({
          agent: agentName,
          ok: false,
          error: `Unknown agent: ${agentName}`,
          attempts: 0,
          pessoa,
        } as AgentResult<unknown>);
      }

      const docs = documentMap.get(key);
      if (!docs || docs.length === 0) {
        console.log(`[orchestrator] No documents found for ${key}, skipping`);
        return Promise.resolve({
          agent: agentName,
          ok: false,
          error: "No documents found for this agent",
          attempts: 0,
          pessoa,
        } as AgentResult<unknown>);
      }

      const input = buildAgentInput(docs, contextJson);
      const agentOptions = resolveAgentOptions(agentName, input, options);
      const label = pessoa ? `${agentName} [${pessoa}]` : agentName;
      console.log(
        `[orchestrator] Running ${label} with ${docs.length} document(s), text: ${input.text.length} chars, images: ${input.images?.length ?? 0}, model: ${agentOptions.modelKey ?? "default"}`,
      );

      return runner(input, agentOptions).then((result) => ({
        ...result,
        pessoa,
      }));
    }),
  );
}

/**
 * Phase 2: Run deterministic financial comparison between Fluxo and Quadro Resumo.
 */
export function runFinancialComparison(
  extractionResults: AgentResult<unknown>[],
): FinancialComparisonResult | undefined {
  const fluxoResult = extractionResults.find(
    (r) => r.agent === "fluxo-agent" && r.ok,
  );
  const quadroResult = extractionResults.find(
    (r) => r.agent === "quadro-resumo-agent" && r.ok,
  );

  if (!fluxoResult?.data || !quadroResult?.data) {
    return undefined;
  }

  const fluxoData = fluxoResult.data as FluxoOutput;
  const quadroData = quadroResult.data as QuadroResumoOutput;

  return compareFinancials(
    fluxoData.output?.financeiro ?? null,
    quadroData.output?.financeiro ?? null,
  );
}

/**
 * Phase 3: Run planta validation against reservation data.
 */
export function runPlantaValidation(
  extractionResults: AgentResult<unknown>[],
  reservaPlanta?: { bloco: string; numero: string },
): PlantaValidationResult | undefined {
  if (!reservaPlanta) return undefined;

  const plantaResult = extractionResults.find(
    (r) => r.agent === "planta-agent" && r.ok,
  );

  if (!plantaResult?.data) {
    return validatePlanta(reservaPlanta, null);
  }

  type PlantaOutputType = {
    output: { bloco: string; apto: string }[];
  };
  const plantaData = plantaResult.data as PlantaOutputType;
  const plantaUnits = plantaData.output ?? [];

  if (plantaUnits.length === 0) {
    return validatePlanta(reservaPlanta, null);
  }

  const firstUnit = plantaUnits[0];
  const plantaForValidation = {
    bloco: firstUnit?.bloco ?? "",
    unidades: plantaUnits.map((u) => ({ unidade: u.apto, ...u })),
  };

  return validatePlanta(reservaPlanta, plantaForValidation);
}

/**
 * Phase 4: Run the AI validation agent to cross-reference all extracted data.
 * Separates results into per-person and global groups.
 */
export async function runCrossValidation(
  extractionResults: AgentResult<unknown>[],
  financialComparison: FinancialComparisonResult | undefined,
  plantaValidation: PlantaValidationResult | undefined,
  options?: AgentRunOptions,
): Promise<AgentResult<ValidationOutput>> {
  const porPessoa: Record<string, Record<string, unknown>> = {};
  const global: Record<string, unknown> = {};

  for (const result of extractionResults) {
    if (!result.ok || !result.data) continue;

    if (result.pessoa) {
      if (!porPessoa[result.pessoa]) {
        porPessoa[result.pessoa] = {};
      }
      porPessoa[result.pessoa][result.agent] = result.data;
    } else {
      global[result.agent] = result.data;
    }
  }

  const validationInput = {
    dados_extraidos: {
      por_pessoa: porPessoa,
      global,
    },
    comparacao_financeira: financialComparison,
    validacao_planta: plantaValidation,
    pessoas_com_documentos: Object.keys(porPessoa),
  };

  const validationText = { text: JSON.stringify(validationInput, null, 2) };
  const validationOptions = resolveAgentOptions("validation-agent", validationText, options);

  return runValidationAgent(validationText, validationOptions);
}

/**
 * Full pipeline: Document-based Extraction → Financial Comparison → Planta Validation → AI Cross-Validation → Report
 */
export async function analyzeContract(
  documentMap: Map<string, DocumentContent[]>,
  contextJson: string,
  options?: AgentRunOptions,
  reservaPlanta?: { bloco: string; numero: string },
): Promise<ContractAnalysis> {
  // Phase 1: Extraction — each agent gets its own document content
  const extractionResults = await runExtraction(documentMap, contextJson, options);

  const failedAgents = extractionResults
    .filter((r) => !r.ok)
    .map((r) => r.agent);

  const fluxoResult = extractionResults.find(
    (r) => r.agent === "fluxo-agent" && r.ok,
  );
  const atoResult = extractionResults.find(
    (r) => r.agent === "ato-agent" && r.ok,
  );

  const fluxoData = fluxoResult?.data as
    | { output?: { financeiro?: { valor_venda_total?: number } } }
    | undefined;
  const atoData = atoResult?.data as
    | { output?: { valor_total?: number } }
    | undefined;

  // Phase 2: Deterministic financial comparison
  const financialComparison = runFinancialComparison(extractionResults);

  // Phase 3: Planta validation
  const plantaValidation = runPlantaValidation(
    extractionResults,
    reservaPlanta,
  );

  // Phase 4: AI cross-validation
  let validation: ValidationOutput | undefined;
  let formattedReport: string | undefined;
  let validationResult: AgentResult<ValidationOutput> | undefined;

  try {
    validationResult = await runCrossValidation(
      extractionResults,
      financialComparison,
      plantaValidation,
      options,
    );

    if (validationResult.ok && validationResult.data) {
      validation = validationResult.data;
      formattedReport = formatValidationReport(validation);
    }
  } catch (err) {
    console.error("[validation-agent] Error running cross-validation:", err);
  }

  const allResults = validationResult
    ? [...extractionResults, validationResult as AgentResult<unknown>]
    : extractionResults;

  return {
    ok: extractionResults.some((r) => r.ok),
    results: allResults,
    summary: {
      failed_agents: failedAgents,
      totals: {
        fluxo_valor_total: fluxoData?.output?.financeiro?.valor_venda_total,
        ato_valor_total: atoData?.output?.valor_total,
      },
    },
    financialComparison,
    plantaValidation,
    validation,
    formattedReport,
  };
}
