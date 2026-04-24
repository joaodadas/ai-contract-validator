import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { snapshotPrompts } from "@/ai/_base/loadPrompt";
import { isPromptKey, PROMPT_KEYS, type PromptKey } from "@/lib/prompt-keys";
import { fetchReserva, fetchDocumentos } from "@/lib/cvcrm/client";
import { downloadAllDocuments } from "@/lib/cvcrm/documentDownloader";
import { mapDocumentsToAgents, buildAgentInput } from "@/ai/orchestrator/agentDocumentMapper";
import type { AgentRunOptions } from "@/ai/_base/types";

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

const RUNNERS = {
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
} as const;

type RunnerKey = keyof typeof RUNNERS;

const bodySchema = z.object({
  content: z.string().min(1).max(50000),
  idReserva: z.number().int().positive(),
  targetAgent: z.enum(PROMPT_KEYS as unknown as [string, ...string[]]).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  await requireAdmin();
  const { key } = await params;
  if (!isPromptKey(key)) {
    return NextResponse.json({ error: "Unknown prompt key" }, { status: 404 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Resolve which agent to run
  let runnerKey: RunnerKey;
  if (key === "extraction-base") {
    if (!parsed.data.targetAgent || parsed.data.targetAgent === "extraction-base") {
      return NextResponse.json(
        { error: "targetAgent is required when testing extraction-base" },
        { status: 400 },
      );
    }
    runnerKey = parsed.data.targetAgent as RunnerKey;
  } else {
    runnerKey = key as RunnerKey;
  }

  // Fetch reservation + documents
  const reserva = await fetchReserva(parsed.data.idReserva);
  const documentosResponse = await fetchDocumentos(parsed.data.idReserva);

  // Extract the documentos map (Record<string, CvcrmDocumentoItem[]>) from the response
  const documentos = documentosResponse?.dados?.documentos ?? {};

  // Download documents
  const documentContents = await downloadAllDocuments(documentos);

  // Map documents to agents
  const docMap = mapDocumentsToAgents(documentContents);

  // Find docs for the target agent. The map key may be `runnerKey` or `runnerKey:<pessoa>`.
  // For testing, pick the first entry matching the agent prefix.
  const matchingKey = Array.from(docMap.keys()).find(
    (k) => k === runnerKey || k.startsWith(`${runnerKey}:`),
  );
  const docs = matchingKey ? docMap.get(matchingKey) : undefined;

  if (!docs || docs.length === 0) {
    return NextResponse.json(
      {
        error: `No documents found for agent ${runnerKey} in reservation ${parsed.data.idReserva}`,
      },
      { status: 422 },
    );
  }

  // Compose prompt — base + agent content, with draft content going to the right slot
  const snap = await snapshotPrompts();
  const baseContent = key === "extraction-base" ? parsed.data.content : snap["extraction-base"].content;
  const agentContent = key === "extraction-base" ? snap[runnerKey as PromptKey].content : parsed.data.content;

  const options: AgentRunOptions = {
    promptOverride: {
      content: `${baseContent}\n\n${agentContent}`,
      version: "test-draft",
    },
  };

  const runner = RUNNERS[runnerKey];
  const contextJson = JSON.stringify({ reserva }, null, 2);
  const input = buildAgentInput(docs, contextJson);

  const start = Date.now();
  const result = await runner(input, options);
  const latencyMs = Date.now() - start;

  return NextResponse.json({
    ok: result.ok,
    output: result.data,
    rawOutput: result.raw,
    error: result.error,
    provider: result.provider,
    model: result.model,
    latencyMs,
  });
}
