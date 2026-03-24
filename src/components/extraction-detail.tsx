"use client";

import { useState } from "react";
import { ChevronRight, Cpu, Code } from "lucide-react";
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

function renderExtractedField(key: string, value: unknown, depth = 0): React.ReactNode {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "object" && !Array.isArray(value)) {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([k]) => k !== "schema_version" && k !== "confianca",
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
          {entries.map(([k, v]) => renderExtractedField(k, v, depth + 1))}
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
                  renderExtractedField(k, v, depth + 1),
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div key={key} className="flex items-start gap-2 py-0.5">
        <MicroText className="text-text-muted shrink-0 min-w-[100px]">{formatKey(key)}:</MicroText>
        <MicroText className="text-text-primary">{value.join(", ")}</MicroText>
      </div>
    );
  }

  return (
    <div key={key} className="flex items-start gap-2 py-0.5">
      <MicroText className="text-text-muted shrink-0 min-w-[100px]">{formatKey(key)}:</MicroText>
      <MicroText className="text-text-primary font-mono">{String(value)}</MicroText>
    </div>
  );
}

function formatKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

type ExtractionDetailProps = {
  agentName: string;
  data: Record<string, unknown> | null;
  ok: boolean;
  children: React.ReactNode;
};

export function ExtractionDetail({ agentName, data, ok, children }: ExtractionDetailProps) {
  const [open, setOpen] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const label = AGENT_LABELS[agentName] ?? agentName;

  const extractedData = data && typeof data === "object" && "output" in data
    ? (data as { output: Record<string, unknown> }).output
    : data;

  const hasData = extractedData && typeof extractedData === "object" && Object.keys(extractedData).length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-1 cursor-pointer group"
        onClick={() => setOpen(!open)}
      >
        <ChevronRight
          className={`h-3.5 w-3.5 shrink-0 text-text-muted transition-transform duration-150 ${open ? "rotate-90" : ""}`}
          strokeWidth={2}
        />
        <div className="flex-1 min-w-0">{children}</div>
      </div>

      {open && (
        <div className="ml-7 mt-1.5 mb-2 animate-in fade-in-0 slide-in-from-top-1 duration-150">
          <div className="rounded-lg border border-border-subtle bg-surface-subtle/50 p-3 space-y-2">
            <div className="flex items-center gap-1.5 pb-1 border-b border-border-subtle mb-2">
              <Cpu className="h-3 w-3 text-primary" strokeWidth={2} />
              <MicroText className="font-semibold text-primary">
                Extração IA — {label}
              </MicroText>
              {ok ? (
                <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 px-1.5 py-0.5 rounded">
                  Sucesso
                </span>
              ) : (
                <span className="text-[10px] font-medium text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400 px-1.5 py-0.5 rounded">
                  Falha
                </span>
              )}
              {hasData && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowRaw(!showRaw);
                  }}
                  className="ml-auto flex items-center gap-1 text-[10px] font-medium text-text-muted hover:text-text-secondary transition-colors px-1.5 py-0.5 rounded border border-border-subtle"
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
                Object.entries(extractedData as Record<string, unknown>)
                  .filter(([k]) => k !== "schema_version" && k !== "confianca")
                  .map(([k, v]) => renderExtractedField(k, v, 0))
              )
            ) : !ok ? (
              <MicroText className="text-red-500 italic">
                A extração falhou para este documento. Verifique os logs de auditoria.
              </MicroText>
            ) : (
              <MicroText className="text-text-muted italic">
                Extração concluída, mas nenhum dado foi encontrado no documento.
              </MicroText>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
