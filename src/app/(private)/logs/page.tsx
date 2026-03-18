export const dynamic = "force-dynamic";

import Link from "next/link";
import { Topbar } from "@/components/layout/topbar";
import { SurfaceCard } from "@/components/surface-card";
import { StatusBadge } from "@/components/status-badge";
import { PageContainer } from "@/components/page-container";
import {
  Text,
  MicroText,
  MutedText,
  SectionTitle,
} from "@/components/typography";
import {
  Info,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Clock,
  Cpu,
  ChevronRight,
} from "lucide-react";
import { getRecentAuditsWithDetails } from "@/db/queries";

function formatDate(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatMs(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

const AGENT_LABELS: Record<string, string> = {
  "cnh-agent": "CNH",
  "rgcpf-agent": "RG/CPF",
  "ato-agent": "ATO",
  "quadro-resumo-agent": "Quadro Resumo",
  "fluxo-agent": "Fluxo",
  "planta-agent": "Planta",
  "comprovante-residencia-agent": "Comprov. Residência",
  "declaracao-residencia-agent": "Decl. Residência",
  "certidao-estado-civil-agent": "Certidão Estado Civil",
  "termo-agent": "Termo",
  "carteira-trabalho-agent": "Carteira Trabalho",
  "comprovante-renda-agent": "Comprov. Renda",
  "carta-fiador-agent": "Carta Fiador",
  "validation-agent": "Validação Cruzada",
};

function resolveAgentLabel(msg: string): string {
  let formatted = msg;
  for (const [key, label] of Object.entries(AGENT_LABELS)) {
    formatted = formatted.replace(key, label);
  }
  return formatted;
}

type LogLevel = "info" | "warning" | "error";
type AuditLog = {
  id: string;
  level: LogLevel;
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
};

function LogLevelIcon({ level }: { level: LogLevel }) {
  switch (level) {
    case "info":
      return <Info className="h-3.5 w-3.5 text-blue-500" strokeWidth={2} />;
    case "warning":
      return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" strokeWidth={2} />;
    case "error":
      return <XCircle className="h-3.5 w-3.5 text-red-500" strokeWidth={2} />;
  }
}

function AuditStatusIcon({ status }: { status: string }) {
  switch (status) {
    case "approved":
      return <CheckCircle2 className="h-5 w-5 text-emerald-500" strokeWidth={2} />;
    case "divergent":
      return <AlertTriangle className="h-5 w-5 text-red-500" strokeWidth={2} />;
    case "error":
      return <XCircle className="h-5 w-5 text-red-500" strokeWidth={2} />;
    default:
      return <Clock className="h-5 w-5 text-zinc-400" strokeWidth={2} />;
  }
}

function auditStatusVariant(status: string): "success" | "error" | "warning" | "neutral" {
  switch (status) {
    case "approved":
      return "success";
    case "divergent":
      return "error";
    case "error":
      return "error";
    default:
      return "neutral";
  }
}

function auditStatusLabel(status: string): string {
  switch (status) {
    case "approved":
      return "Aprovado";
    case "divergent":
      return "Divergente";
    case "error":
      return "Erro";
    default:
      return status;
  }
}

function extractAgentStats(logs: AuditLog[]) {
  const agents: {
    name: string;
    label: string;
    ok: boolean;
    provider?: string;
    attempts?: number;
  }[] = [];

  for (const log of logs) {
    if (!log.metadata || typeof log.metadata !== "object") continue;
    const meta = log.metadata as Record<string, unknown>;
    if (!meta.agent) continue;

    agents.push({
      name: String(meta.agent),
      label: AGENT_LABELS[String(meta.agent)] ?? String(meta.agent),
      ok: Boolean(meta.ok),
      provider: meta.provider ? String(meta.provider) : undefined,
      attempts: meta.attempts ? Number(meta.attempts) : undefined,
    });
  }

  return agents;
}

function extractValidationSummary(resultJson: Record<string, unknown> | null) {
  if (!resultJson) return null;

  const validation = resultJson.validation as Record<string, unknown> | undefined;
  if (!validation) return null;

  let igual = 0;
  let divergente = 0;
  let ignorado = 0;

  function countStatus(obj: Record<string, unknown>) {
    for (const val of Object.values(obj)) {
      if (val && typeof val === "object" && "status" in (val as Record<string, unknown>)) {
        const s = (val as { status: string }).status;
        if (s === "Igual") igual++;
        else if (s === "Divergente") divergente++;
        else if (s === "Ignorado") ignorado++;
      } else if (val && typeof val === "object") {
        countStatus(val as Record<string, unknown>);
      }
    }
  }
  countStatus(validation);

  return { igual, divergente, ignorado, total: igual + divergente + ignorado };
}

export default async function LogsPage() {
  const audits = await getRecentAuditsWithDetails(50);

  const totalApproved = audits.filter((a) => a.status === "approved").length;
  const totalDivergent = audits.filter((a) => a.status === "divergent").length;
  const totalError = audits.filter((a) => a.status === "error").length;
  const avgTime = audits.length > 0
    ? audits.reduce((sum, a) => sum + a.executionTimeMs, 0) / audits.length
    : 0;

  return (
    <>
      <Topbar
        title="Monitoramento de Execuções"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Logs" },
        ]}
      />

      <PageContainer>
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SurfaceCard elevation={1} className="p-4!">
            <MicroText className="uppercase tracking-wider text-text-muted">Total Execuções</MicroText>
            <p className="text-[24px] font-semibold tracking-tight text-text-primary tabular-nums">{audits.length}</p>
          </SurfaceCard>
          <SurfaceCard elevation={1} className="p-4!">
            <MicroText className="uppercase tracking-wider text-emerald-600">Aprovados</MicroText>
            <p className="text-[24px] font-semibold tracking-tight text-emerald-600 tabular-nums">{totalApproved}</p>
          </SurfaceCard>
          <SurfaceCard elevation={1} className="p-4!">
            <MicroText className="uppercase tracking-wider text-red-500">Divergentes</MicroText>
            <p className="text-[24px] font-semibold tracking-tight text-red-500 tabular-nums">{totalDivergent}</p>
          </SurfaceCard>
          <SurfaceCard elevation={1} className="p-4!">
            <MicroText className="uppercase tracking-wider text-text-muted">Tempo Médio</MicroText>
            <p className="text-[24px] font-semibold tracking-tight text-text-primary tabular-nums">{formatMs(avgTime)}</p>
          </SurfaceCard>
        </div>

        {/* Executions list */}
        <SurfaceCard elevation={1} noPadding>
          <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between">
            <SectionTitle>Execuções Recentes</SectionTitle>
            <MutedText>{audits.length} registros</MutedText>
          </div>

          {audits.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <MutedText>Nenhuma execução registrada ainda.</MutedText>
            </div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {audits.map((audit) => {
                const reservation = audit.reservation;
                const agents = extractAgentStats(audit.logs as AuditLog[]);
                const resultJson = audit.resultJson as Record<string, unknown> | null;
                const validationSummary = extractValidationSummary(resultJson);
                const formattedReport = resultJson?.formattedReport as string | undefined;
                const docCompleteness = resultJson?.documentCompleteness as {
                  complete: boolean;
                  message: string;
                } | undefined;

                const successAgents = agents.filter((a) => a.ok).length;
                const failedAgents = agents.filter((a) => !a.ok).length;

                return (
                  <div key={audit.id} className="px-6 py-5 space-y-3 hover:bg-surface-subtle/20 transition-colors">
                    {/* Header row */}
                    <div className="flex items-start gap-3">
                      <AuditStatusIcon status={audit.status} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {reservation ? (
                            <Link
                              href={`/reservas/${reservation.externalId}`}
                              className="text-[14px] font-semibold text-text-primary hover:text-primary transition-colors inline-flex items-center gap-1"
                            >
                              Reserva #{reservation.externalId}
                              <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
                            </Link>
                          ) : (
                            <Text className="font-semibold">Auditoria</Text>
                          )}
                          <StatusBadge variant={auditStatusVariant(audit.status)} dot={false}>
                            {auditStatusLabel(audit.status)}
                          </StatusBadge>
                          {audit.score !== null && (
                            <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-surface-subtle text-text-muted">
                              Score: {audit.score}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {reservation && (
                            <>
                              <MicroText className="text-text-secondary">{reservation.titularNome}</MicroText>
                              <span className="text-text-muted text-[10px]">·</span>
                              <MicroText className="text-text-muted">{reservation.enterprise}</MicroText>
                            </>
                          )}
                          <span className="text-text-muted text-[10px]">·</span>
                          <MicroText className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" strokeWidth={1.75} />
                            {formatMs(audit.executionTimeMs)}
                          </MicroText>
                          <span className="text-text-muted text-[10px]">·</span>
                          <MicroText>{formatDate(audit.createdAt)}</MicroText>
                          <span className="text-text-muted text-[10px]">·</span>
                          <MicroText className="font-mono text-text-muted">v{audit.promptVersion}</MicroText>
                        </div>
                      </div>
                    </div>

                    {/* Agent breakdown */}
                    {agents.length > 0 && (
                      <div className="pl-8">
                        <div className="flex items-center gap-2 mb-2">
                          <Cpu className="h-3 w-3 text-text-muted" strokeWidth={1.75} />
                          <MicroText className="uppercase tracking-wider text-text-muted font-medium">
                            Agentes: {successAgents} ok{failedAgents > 0 ? `, ${failedAgents} falha(s)` : ""}
                          </MicroText>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {agents.map((agent, i) => (
                            <span
                              key={i}
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ${
                                agent.ok
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                                  : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                              }`}
                            >
                              {agent.ok ? (
                                <CheckCircle2 className="h-3 w-3" strokeWidth={2} />
                              ) : (
                                <XCircle className="h-3 w-3" strokeWidth={2} />
                              )}
                              {agent.label}
                              {agent.provider && (
                                <span className="opacity-60 ml-0.5">({agent.provider})</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Validation summary */}
                    {validationSummary && (
                      <div className="pl-8">
                        <MicroText className="uppercase tracking-wider text-text-muted font-medium mb-1.5 block">
                          Resultado da Validação
                        </MicroText>
                        <div className="flex items-center gap-3">
                          <div className="flex h-1.5 flex-1 max-w-xs rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                            {validationSummary.igual > 0 && (
                              <div
                                className="bg-emerald-500"
                                style={{ width: `${(validationSummary.igual / validationSummary.total) * 100}%` }}
                              />
                            )}
                            {validationSummary.divergente > 0 && (
                              <div
                                className="bg-red-500"
                                style={{ width: `${(validationSummary.divergente / validationSummary.total) * 100}%` }}
                              />
                            )}
                            {validationSummary.ignorado > 0 && (
                              <div
                                className="bg-zinc-300 dark:bg-zinc-600"
                                style={{ width: `${(validationSummary.ignorado / validationSummary.total) * 100}%` }}
                              />
                            )}
                          </div>
                          <MicroText className="tabular-nums shrink-0">
                            <span className="text-emerald-600">{validationSummary.igual}✓</span>
                            {" "}
                            <span className="text-red-500">{validationSummary.divergente}✗</span>
                            {" "}
                            <span className="text-zinc-400">{validationSummary.ignorado}—</span>
                          </MicroText>
                        </div>
                      </div>
                    )}

                    {/* Document completeness failure */}
                    {docCompleteness && !docCompleteness.complete && (
                      <div className="pl-8">
                        <div className="rounded-md bg-red-50 dark:bg-red-950/20 px-3 py-2 text-[12px] text-red-700 dark:text-red-400">
                          {docCompleteness.message}
                        </div>
                      </div>
                    )}

                    {/* Formatted report preview */}
                    {formattedReport && formattedReport !== "Nenhuma divergência encontrada" && (
                      <div className="pl-8">
                        <MicroText className="uppercase tracking-wider text-text-muted font-medium mb-1.5 block">
                          Relatório (Preview)
                        </MicroText>
                        <div className="rounded-md bg-surface-subtle px-3 py-2 text-[12px] leading-relaxed text-text-secondary font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                          {formattedReport.substring(0, 500)}
                          {formattedReport.length > 500 && "..."}
                        </div>
                      </div>
                    )}

                    {/* Log timeline (collapsed by default, show last 3) */}
                    {audit.logs.length > 0 && (
                      <details className="pl-8 group">
                        <summary className="cursor-pointer text-[11px] font-medium text-text-muted hover:text-text-secondary transition-colors uppercase tracking-wider">
                          {audit.logs.length} log entries ▸
                        </summary>
                        <div className="mt-2 space-y-1 border-l-2 border-border-subtle pl-3">
                          {audit.logs.map((log) => {
                            const l = log as AuditLog;
                            return (
                              <div key={l.id} className="flex items-start gap-2 py-0.5">
                                <LogLevelIcon level={l.level} />
                                <div className="min-w-0 flex-1">
                                  <MicroText className="text-text-secondary leading-relaxed">
                                    {resolveAgentLabel(l.message)}
                                  </MicroText>
                                  <MicroText className="text-text-muted block">
                                    {l.createdAt.toLocaleTimeString("pt-BR", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      second: "2-digit",
                                    })}
                                  </MicroText>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </SurfaceCard>
      </PageContainer>
    </>
  );
}
