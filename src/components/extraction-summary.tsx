"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  Cpu,
  FileText,
  CheckCircle2,
  XCircle,
  Code,
} from "lucide-react";
import { MicroText } from "@/components/typography";

const AGENT_LABELS: Record<string, string> = {
  "cnh-agent": "CNH",
  "rgcpf-agent": "RG/CPF",
  "ato-agent": "ATO",
  "quadro-resumo-agent": "Quadro Resumo",
  "fluxo-agent": "Fluxo Financeiro",
  "planta-agent": "Planta",
  "comprovante-residencia-agent": "Comprovante Residência",
  "declaracao-residencia-agent": "Declaração Residência",
  "certidao-estado-civil-agent": "Certidão Estado Civil",
  "termo-agent": "Termo de Ciência",
  "carteira-trabalho-agent": "Carteira de Trabalho",
  "comprovante-renda-agent": "Comprovante de Renda",
  "carta-fiador-agent": "Carta Fiador",
};

// Display order for agents (identity → financial → property → other)
const AGENT_ORDER: string[] = [
  "rgcpf-agent",
  "cnh-agent",
  "certidao-estado-civil-agent",
  "comprovante-renda-agent",
  "carteira-trabalho-agent",
  "comprovante-residencia-agent",
  "declaracao-residencia-agent",
  "quadro-resumo-agent",
  "fluxo-agent",
  "ato-agent",
  "planta-agent",
  "termo-agent",
  "carta-fiador-agent",
];

type SourceDocument = {
  nome: string;
  tipo: string;
  origin: "documento" | "contrato";
};

type AgentExtractionEntry = {
  agentName: string;
  ok: boolean;
  data: Record<string, unknown> | null;
  sourceDocuments: SourceDocument[];
};

function formatKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function renderField(key: string, value: unknown, depth = 0): React.ReactNode {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "object" && !Array.isArray(value)) {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([k]) => k !== "schema_version" && k !== "confianca" && k !== "document_type",
    );
    if (entries.length === 0) return null;

    return (
      <div key={key} className={depth > 0 ? "ml-3 border-l border-border-subtle pl-3" : ""}>
        {key !== "output" && (
          <MicroText className="font-semibold text-text-secondary uppercase tracking-wider block mb-1">
            {formatKey(key)}
          </MicroText>
        )}
        <div className="space-y-1">
          {entries.map(([k, v]) => renderField(k, v, depth + 1))}
        </div>
      </div>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return null;

    if (typeof value[0] === "object") {
      return (
        <div key={key} className={depth > 0 ? "ml-3 border-l border-border-subtle pl-3" : ""}>
          <MicroText className="font-semibold text-text-secondary uppercase tracking-wider block mb-1">
            {formatKey(key)} ({value.length})
          </MicroText>
          <div className="space-y-2">
            {value.map((item, i) => (
              <div key={i} className="rounded bg-surface-base/50 p-2 space-y-1">
                {Object.entries(item as Record<string, unknown>).map(([k, v]) =>
                  renderField(k, v, depth + 1),
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div key={key} className="flex items-start gap-2 py-0.5">
        <MicroText className="text-text-muted shrink-0 min-w-[120px]">{formatKey(key)}:</MicroText>
        <MicroText className="text-text-primary">{value.join(", ")}</MicroText>
      </div>
    );
  }

  return (
    <div key={key} className="flex items-start gap-2 py-0.5">
      <MicroText className="text-text-muted shrink-0 min-w-[120px]">{formatKey(key)}:</MicroText>
      <MicroText className="text-text-primary font-mono">{String(value)}</MicroText>
    </div>
  );
}

function AgentAccordion({ entry }: { entry: AgentExtractionEntry }) {
  const [open, setOpen] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const label = AGENT_LABELS[entry.agentName] ?? entry.agentName;

  const extractedData =
    entry.data && typeof entry.data === "object" && "output" in entry.data
      ? (entry.data as { output: Record<string, unknown> }).output
      : entry.data;

  const hasData =
    extractedData &&
    typeof extractedData === "object" &&
    Object.keys(extractedData).length > 0;

  const fieldCount = hasData
    ? Object.values(extractedData as Record<string, unknown>).filter(
        (v) => v !== null && v !== undefined && v !== "" && v !== 0,
      ).length
    : 0;

  return (
    <div className="overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 py-3 px-3 rounded-lg hover:bg-surface-base/40 transition-colors"
      >
        <Cpu
          className={cn(
            "h-4 w-4 shrink-0",
            entry.ok ? "text-emerald-500" : "text-red-500",
          )}
          strokeWidth={1.75}
        />
        <div className="flex-1 text-left min-w-0">
          <span className="text-[14px] font-semibold text-text-primary tracking-tight">
            {label}
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            {entry.sourceDocuments.map((doc, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-[11px] text-text-muted"
              >
                <FileText className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                {doc.nome}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {entry.ok ? (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" strokeWidth={2} />
              {fieldCount > 0 ? `${fieldCount} campos` : "Sucesso"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400">
              <XCircle className="h-3 w-3" strokeWidth={2} />
              Falha
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-text-muted transition-transform duration-200",
              !open && "-rotate-90",
            )}
            strokeWidth={1.75}
          />
        </div>
      </button>

      {open && (
        <div className="px-3 pb-3 animate-in fade-in-0 slide-in-from-top-1 duration-150">
          {/* Source documents */}
          <div className="mb-3 rounded-lg bg-surface-base/60 px-3 py-2">
            <MicroText className="font-semibold text-text-muted uppercase tracking-wider block mb-1.5">
              Documentos de Origem
            </MicroText>
            <div className="space-y-1">
              {entry.sourceDocuments.map((doc, i) => (
                <div key={i} className="flex items-center gap-2">
                  <FileText className="h-3 w-3 shrink-0 text-text-muted" strokeWidth={1.5} />
                  <MicroText className="text-text-primary">{doc.nome}</MicroText>
                  <MicroText className="text-text-muted">
                    ({doc.origin === "contrato" ? "Contrato" : doc.tipo})
                  </MicroText>
                </div>
              ))}
            </div>
          </div>

          {/* Extracted data */}
          <div className="rounded-lg border border-border-subtle bg-surface-subtle/50 p-3 space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-border-subtle mb-2">
              <MicroText className="font-semibold text-primary">
                Dados Extraídos
              </MicroText>
              {hasData && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowRaw(!showRaw);
                  }}
                  className="flex items-center gap-1 text-[10px] font-medium text-text-muted hover:text-text-secondary transition-colors px-1.5 py-0.5 rounded border border-border-subtle"
                >
                  <Code className="h-2.5 w-2.5" strokeWidth={2} />
                  {showRaw ? "Formatado" : "JSON"}
                </button>
              )}
            </div>

            {hasData ? (
              showRaw ? (
                <pre className="text-[11px] text-text-secondary font-mono overflow-auto max-h-64 whitespace-pre-wrap break-words">
                  {JSON.stringify(extractedData, null, 2)}
                </pre>
              ) : (
                <div className="space-y-1">
                  {Object.entries(extractedData as Record<string, unknown>)
                    .filter(
                      ([k]) =>
                        k !== "schema_version" &&
                        k !== "confianca" &&
                        k !== "document_type",
                    )
                    .map(([k, v]) => renderField(k, v, 0))}
                </div>
              )
            ) : !entry.ok ? (
              <MicroText className="text-red-500 italic">
                A extração falhou para este agente. Verifique os logs de auditoria.
              </MicroText>
            ) : (
              <MicroText className="text-text-muted italic">
                Extração concluída, mas nenhum dado foi encontrado.
              </MicroText>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export type ExtractionSummaryProps = {
  extractions: AgentExtractionEntry[];
  className?: string;
};

export function ExtractionSummary({ extractions, className }: ExtractionSummaryProps) {
  const successCount = extractions.filter((e) => e.ok).length;
  const failCount = extractions.filter((e) => !e.ok).length;

  // Sort by predefined order
  const sorted = [...extractions].sort((a, b) => {
    const ia = AGENT_ORDER.indexOf(a.agentName);
    const ib = AGENT_ORDER.indexOf(b.agentName);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/30">
          <Cpu className="h-4 w-4 text-blue-500" strokeWidth={2} />
        </div>
        <div className="flex-1">
          <p className="text-[14px] font-semibold text-text-primary tracking-tight">
            Dados Extraídos por Documento
          </p>
          <p className="text-[12px] text-text-muted">
            Dados que a IA conseguiu extrair de cada documento antes da validação
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-[11px] text-text-muted">{successCount} sucesso</span>
          </div>
          {failCount > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-[11px] text-text-muted">{failCount} falha</span>
            </div>
          )}
        </div>
      </div>

      {/* Agent accordions */}
      <div
        className="space-y-1 rounded-xl bg-surface-subtle p-2"
        style={{
          boxShadow:
            "0px 0px 0px 1px rgba(0,0,0,0.04), 0px 1px 1px 0px rgba(0,0,0,0.03)",
        }}
      >
        {sorted.map((entry) => (
          <AgentAccordion key={entry.agentName} entry={entry} />
        ))}
      </div>
    </div>
  );
}
