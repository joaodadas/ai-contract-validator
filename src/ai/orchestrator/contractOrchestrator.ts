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

const AGENT_RUNNERS: Record<
  AgentName,
  (input: AgentInput, options?: AgentRunOptions) => Promise<AgentResult<unknown>>
> = {
  "cnh-agent": runCnhAgent,
  "rgcpf-agent": runRgcpfAgent,
  "ato-agent": runAtoAgent,
  "quadro-resumo-agent": runQuadroResumoAgent,
  "fluxo-agent": runFluxoAgent,
  "planta-agent": runPlantaAgent,
};

const ALL_AGENTS: AgentName[] = [
  "cnh-agent",
  "rgcpf-agent",
  "ato-agent",
  "quadro-resumo-agent",
  "fluxo-agent",
  "planta-agent",
];

type ContractAnalysis = {
  ok: boolean;
  results: AgentResult<unknown>[];
  summary: {
    failed_agents: AgentName[];
    totals: {
      fluxo_valor_total?: number;
      ato_valor_total?: number;
    };
  };
};

export async function analyzeContract(
  input: AgentInput,
  agents?: AgentName[],
  options?: AgentRunOptions
): Promise<ContractAnalysis> {
  const selectedAgents = agents ?? ALL_AGENTS;

  const results = await Promise.all(
    selectedAgents.map((name) => {
      const runner = AGENT_RUNNERS[name];
      return runner(input, options);
    })
  );

  const failedAgents = results
    .filter((r) => !r.ok)
    .map((r) => r.agent);

  const fluxoResult = results.find((r) => r.agent === "fluxo-agent" && r.ok);
  const atoResult = results.find((r) => r.agent === "ato-agent" && r.ok);

  const fluxoData = fluxoResult?.data as { output?: { valor_total?: number } } | undefined;
  const atoData = atoResult?.data as { output?: { valor_total?: number } } | undefined;

  return {
    ok: results.some((r) => r.ok),
    results,
    summary: {
      failed_agents: failedAgents,
      totals: {
        fluxo_valor_total: fluxoData?.output?.valor_total,
        ato_valor_total: atoData?.output?.valor_total,
      },
    },
  };
}
