"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Info,
  Brain,
} from "lucide-react";

type LogLevel = "info" | "warning" | "error";

type AuditLog = {
  id: string;
  level: LogLevel;
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

type AuditEntry = {
  id: string;
  status: "approved" | "divergent" | "error";
  score: number | null;
  executionTimeMs: number;
  createdAt: string;
  logs: AuditLog[];
};

type ReservationStatus = "pending" | "approved" | "divergent" | "confirmed";

type StatusResponse = {
  status: ReservationStatus;
  audits: AuditEntry[];
};

interface AnalysisProgressProps {
  reservationId: string;
  initialStatus: ReservationStatus;
}

const AGENT_LABELS: Record<string, string> = {
  "cnh-agent": "CNH",
  "rgcpf-agent": "RG/CPF",
  "ato-agent": "ATO",
  "quadro-resumo-agent": "Quadro Resumo",
  "fluxo-agent": "Fluxo",
  "planta-agent": "Planta",
  "comprovante-residencia-agent": "Comprovante de Residência",
  "declaracao-residencia-agent": "Declaração de Residência",
  "certidao-estado-civil-agent": "Certidão de Estado Civil",
  "termo-agent": "Termo de Ciência",
  "carteira-trabalho-agent": "Carteira de Trabalho",
  "comprovante-renda-agent": "Comprovante de Renda",
  "carta-fiador-agent": "Carta Fiador",
  "validation-agent": "Validação Cruzada",
};

function LogIcon({ level }: { level: LogLevel }) {
  switch (level) {
    case "info":
      return <Info className="h-3.5 w-3.5 text-blue-500" strokeWidth={2} />;
    case "warning":
      return (
        <AlertTriangle
          className="h-3.5 w-3.5 text-amber-500"
          strokeWidth={2}
        />
      );
    case "error":
      return <XCircle className="h-3.5 w-3.5 text-red-500" strokeWidth={2} />;
  }
}

function formatAgentMessage(message: string): string {
  for (const [key, label] of Object.entries(AGENT_LABELS)) {
    message = message.replace(key, label);
  }
  return message;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function AnalysisProgress({
  reservationId,
  initialStatus,
}: AnalysisProgressProps) {
  const [status, setStatus] = useState(initialStatus);
  const [audits, setAudits] = useState<AuditEntry[]>([]);
  const [polling, setPolling] = useState(initialStatus === "pending");
  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/reservas/${reservationId}/status`);
      if (!res.ok) return;

      const data: StatusResponse = await res.json();
      setAudits(data.audits);

      if (data.status !== "pending") {
        setStatus(data.status);
        setPolling(false);
        router.refresh();
      }
    } catch {
      // Network error — keep polling
    }
  }, [reservationId, router]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (!polling) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(fetchStatus, 2000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [polling, fetchStatus]);

  const latestAudit = audits[0];
  const logs = latestAudit?.logs ?? [];

  const isRunning = status === "pending";
  const isSuccess = status === "approved" || status === "confirmed";
  const isDivergent = status === "divergent";

  return (
    <div
      className={cn(
        "rounded-xl border p-5",
        isRunning && "border-primary/20 bg-primary/3",
        isSuccess && "border-status-success/20 bg-status-success/3",
        isDivergent && "border-status-error/20 bg-status-error/3"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            isRunning && "bg-primary/10",
            isSuccess && "bg-status-success/10",
            isDivergent && "bg-status-error/10"
          )}
        >
          {isRunning ? (
            <Loader2
              className="h-4 w-4 text-primary animate-spin"
              strokeWidth={2}
            />
          ) : isSuccess ? (
            <CheckCircle2
              className="h-4 w-4 text-status-success"
              strokeWidth={2}
            />
          ) : (
            <AlertTriangle
              className="h-4 w-4 text-status-error"
              strokeWidth={2}
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold leading-[18px] tracking-[-0.01em] text-text-primary">
            {isRunning
              ? "Análise em andamento..."
              : isSuccess
                ? "Análise concluída"
                : "Análise com divergências"}
          </p>
          <p className="text-[12px] text-text-muted mt-0.5">
            {isRunning
              ? "Os agentes de IA estão processando os documentos"
              : latestAudit
                ? `Concluída em ${(latestAudit.executionTimeMs / 1000).toFixed(1)}s`
                : "Sem dados de auditoria"}
          </p>
        </div>
        {isRunning && (
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span className="text-[11px] font-medium text-primary">
              Ao vivo
            </span>
          </div>
        )}
      </div>

      {/* Timeline */}
      {logs.length > 0 && (
        <div className="relative pl-5 space-y-0">
          <div className="absolute left-[6.5px] top-1 bottom-1 w-px bg-border-subtle" />

          {logs.map((log, i) => {
            const isLast = i === logs.length - 1;
            const isAgentLog =
              log.metadata &&
              typeof log.metadata === "object" &&
              "agent" in log.metadata;

            return (
              <div key={log.id} className="relative flex items-start gap-3 py-1.5">
                <div
                  className={cn(
                    "absolute -left-5 top-[9px] z-10 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-surface-elevated",
                    isLast && isRunning && "ring-2 ring-primary/20"
                  )}
                >
                  {isLast && isRunning ? (
                    <Loader2
                      className="h-3 w-3 text-primary animate-spin"
                      strokeWidth={2.5}
                    />
                  ) : (
                    <LogIcon level={log.level} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[13px] leading-[18px] text-text-primary break-words">
                    {formatAgentMessage(
                      log.message.length > 200
                        ? log.message.substring(0, 200) + "..."
                        : log.message
                    )}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-text-muted">
                      {formatTime(log.createdAt)}
                    </span>
                    {isAgentLog && log.metadata && (
                      <>
                        {(log.metadata as Record<string, unknown>).provider && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-subtle text-text-muted font-mono">
                            {String(
                              (log.metadata as Record<string, unknown>).provider
                            )}
                          </span>
                        )}
                        {(log.metadata as Record<string, unknown>).attempts && (
                          <span className="text-[10px] text-text-muted">
                            {String(
                              (log.metadata as Record<string, unknown>).attempts
                            )}{" "}
                            tentativa(s)
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state while waiting for first log */}
      {logs.length === 0 && isRunning && (
        <div className="flex items-center gap-3 py-3 pl-1">
          <Loader2
            className="h-4 w-4 text-primary animate-spin"
            strokeWidth={2}
          />
          <p className="text-[13px] text-text-muted">
            Aguardando início dos agentes...
          </p>
        </div>
      )}

      {/* Score badge when complete */}
      {!isRunning && latestAudit?.score != null && (
        <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain
              className="h-3.5 w-3.5 text-text-muted"
              strokeWidth={1.75}
            />
            <span className="text-[12px] text-text-muted">
              Score da análise
            </span>
          </div>
          <span
            className={cn(
              "text-[14px] font-semibold tabular-nums",
              isSuccess ? "text-status-success" : "text-status-error"
            )}
          >
            {latestAudit.score}/100
          </span>
        </div>
      )}
    </div>
  );
}
