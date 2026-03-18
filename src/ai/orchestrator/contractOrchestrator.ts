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

type ExtractorRunner = (input: AgentInput, options?: AgentRunOptions) => Promise<AgentResult<unknown>>;

const EXTRACTION_AGENTS: Record<AgentName, ExtractorRunner> = {
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

const ALL_EXTRACTION_AGENTS: AgentName[] = [
  "cnh-agent",
  "rgcpf-agent",
  "ato-agent",
  "quadro-resumo-agent",
  "fluxo-agent",
  "planta-agent",
  "comprovante-residencia-agent",
  "declaracao-residencia-agent",
  "certidao-estado-civil-agent",
  "termo-agent",
  "carteira-trabalho-agent",
  "comprovante-renda-agent",
  "carta-fiador-agent",
];

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
 * Phase 1: Run extraction agents in parallel on the provided text input.
 */
export async function runExtraction(
  input: AgentInput,
  agents?: AgentName[],
  options?: AgentRunOptions
): Promise<AgentResult<unknown>[]> {
  const selectedAgents = agents ?? ALL_EXTRACTION_AGENTS;

  return Promise.all(
    selectedAgents.map((name) => {
      const runner = EXTRACTION_AGENTS[name];
      if (!runner) {
        return Promise.resolve({
          agent: name,
          ok: false,
          error: `Unknown agent: ${name}`,
          attempts: 0,
        } as AgentResult<unknown>);
      }
      return runner(input, options);
    })
  );
}

/**
 * Phase 2: Run deterministic financial comparison between Fluxo and Quadro Resumo.
 */
export function runFinancialComparison(
  extractionResults: AgentResult<unknown>[]
): FinancialComparisonResult | undefined {
  const fluxoResult = extractionResults.find(
    (r) => r.agent === "fluxo-agent" && r.ok
  );
  const quadroResult = extractionResults.find(
    (r) => r.agent === "quadro-resumo-agent" && r.ok
  );

  if (!fluxoResult?.data || !quadroResult?.data) {
    return undefined;
  }

  const fluxoData = fluxoResult.data as FluxoOutput;
  const quadroData = quadroResult.data as QuadroResumoOutput;

  return compareFinancials(
    fluxoData.output?.financeiro ?? null,
    quadroData.output?.financeiro ?? null
  );
}

/**
 * Phase 3: Run planta validation against reservation data.
 */
export function runPlantaValidation(
  extractionResults: AgentResult<unknown>[],
  reservaPlanta?: { bloco: string; numero: string }
): PlantaValidationResult | undefined {
  if (!reservaPlanta) return undefined;

  const plantaResult = extractionResults.find(
    (r) => r.agent === "planta-agent" && r.ok
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
 */
export async function runCrossValidation(
  extractionResults: AgentResult<unknown>[],
  financialComparison: FinancialComparisonResult | undefined,
  plantaValidation: PlantaValidationResult | undefined,
  options?: AgentRunOptions
): Promise<AgentResult<ValidationOutput>> {
  const consolidatedData: Record<string, unknown> = {};

  for (const result of extractionResults) {
    if (result.ok && result.data) {
      consolidatedData[result.agent] = result.data;
    }
  }

  const validationInput = {
    dados_extraidos: consolidatedData,
    comparacao_financeira: financialComparison,
    validacao_planta: plantaValidation,
  };

  return runValidationAgent(
    { text: JSON.stringify(validationInput, null, 2) },
    options
  );
}

/**
 * Full pipeline: Extraction → Financial Comparison → Planta Validation → AI Cross-Validation → Report
 */
export async function analyzeContract(
  input: AgentInput,
  agents?: AgentName[],
  options?: AgentRunOptions,
  reservaPlanta?: { bloco: string; numero: string }
): Promise<ContractAnalysis> {
  // Phase 1: Extraction
  const extractionResults = await runExtraction(input, agents, options);

  const failedAgents = extractionResults
    .filter((r) => !r.ok)
    .map((r) => r.agent);

  const fluxoResult = extractionResults.find(
    (r) => r.agent === "fluxo-agent" && r.ok
  );
  const atoResult = extractionResults.find(
    (r) => r.agent === "ato-agent" && r.ok
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
    reservaPlanta
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
      options
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
