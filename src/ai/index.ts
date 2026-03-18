// Orchestrator
export {
  analyzeContract,
  runExtraction,
  runFinancialComparison,
  runPlantaValidation,
  runCrossValidation,
  type ContractAnalysis,
} from "./orchestrator/contractOrchestrator";

// Extraction agent runners
export { runCnhAgent } from "./agents/cnh-agent/agent";
export { runRgcpfAgent } from "./agents/rgcpf-agent/agent";
export { runAtoAgent } from "./agents/ato-agent/agent";
export { runQuadroResumoAgent } from "./agents/quadro-resumo-agent/agent";
export { runFluxoAgent } from "./agents/fluxo-agent/agent";
export { runPlantaAgent } from "./agents/planta-agent/agent";
export { runComprovanteResidenciaAgent } from "./agents/comprovante-residencia-agent/agent";
export { runDeclaracaoResidenciaAgent } from "./agents/declaracao-residencia-agent/agent";
export { runCertidaoEstadoCivilAgent } from "./agents/certidao-estado-civil-agent/agent";
export { runTermoAgent } from "./agents/termo-agent/agent";
export { runCarteiraTrabalhoAgent } from "./agents/carteira-trabalho-agent/agent";
export { runComprovanteRendaAgent } from "./agents/comprovante-renda-agent/agent";
export { runCartaFiadorAgent } from "./agents/carta-fiador-agent/agent";

// Validation agent runner
export { runValidationAgent } from "./agents/validation-agent/agent";

// Types
export type {
  Provider,
  ModelKey,
  AgentName,
  AgentInput,
  AgentRunOptions,
  AgentResult,
} from "./_base/types";

// Extraction schemas
export { cnhSchema, type CnhOutput } from "./agents/cnh-agent/schema";
export { rgcpfSchema, type RgcpfOutput } from "./agents/rgcpf-agent/schema";
export { atoSchema, type AtoOutput } from "./agents/ato-agent/schema";
export { quadroResumoSchema, type QuadroResumoOutput } from "./agents/quadro-resumo-agent/schema";
export { fluxoSchema, type FluxoOutput } from "./agents/fluxo-agent/schema";
export { plantaSchema, type PlantaOutput } from "./agents/planta-agent/schema";
export { comprovanteResidenciaSchema, type ComprovanteResidenciaOutput } from "./agents/comprovante-residencia-agent/schema";
export { declaracaoResidenciaSchema, type DeclaracaoResidenciaOutput } from "./agents/declaracao-residencia-agent/schema";
export { certidaoEstadoCivilSchema, type CertidaoEstadoCivilOutput } from "./agents/certidao-estado-civil-agent/schema";
export { termoSchema, type TermoOutput } from "./agents/termo-agent/schema";
export { carteiraTrabalhoSchema, type CarteiraTrabalhoOutput } from "./agents/carteira-trabalho-agent/schema";
export { comprovanteRendaSchema, type ComprovanteRendaOutput } from "./agents/comprovante-renda-agent/schema";
export { cartaFiadorSchema, type CartaFiadorOutput } from "./agents/carta-fiador-agent/schema";

// Validation schema
export { validationSchema, type ValidationOutput } from "./agents/validation-agent/schema";

// Validation utilities
export { compareFinancials, type FinancialComparisonResult } from "./validation/financial-comparison";
export { checkDocumentCompleteness } from "./validation/document-completeness";
export { validatePlanta, type PlantaValidationResult } from "./validation/planta-validation";
export { formatValidationReport } from "./validation/report-formatter";

// LLM utilities
export { MODEL_MAP, callLLM } from "./_base/llm";
