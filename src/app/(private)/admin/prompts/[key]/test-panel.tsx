"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SurfaceCard } from "@/components/surface-card";
import { PROMPT_KEYS, type PromptKey } from "@/lib/prompt-keys";

type Props = {
  promptKey: string;
  draftContent: string;
};

type TestResult = {
  ok?: boolean;
  output?: unknown;
  rawOutput?: string;
  error?: string;
  provider?: string;
  model?: string;
  latencyMs?: number;
};

const TARGET_OPTIONS = PROMPT_KEYS.filter((k) => k !== "extraction-base");

export function TestPanel({ promptKey, draftContent }: Props) {
  const [idReserva, setIdReserva] = useState("");
  const [targetAgent, setTargetAgent] = useState<PromptKey>("cnh-agent");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isBase = promptKey === "extraction-base";

  async function runTest() {
    setLoading(true);
    setError(null);
    setResult(null);
    const body: Record<string, unknown> = {
      content: draftContent,
      idReserva: Number(idReserva),
    };
    if (isBase) body.targetAgent = targetAgent;

    try {
      const res = await fetch(`/api/admin/prompts/${promptKey}/test`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : JSON.stringify(json.error));
      } else {
        setResult(json);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SurfaceCard elevation={1}>
      <div className="text-sm font-semibold">Testar rascunho contra reserva real</div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Input
          placeholder="idReserva do CVCRM"
          value={idReserva}
          onChange={(e) => setIdReserva(e.target.value.replace(/\D/g, ""))}
          className="h-8 w-[200px] text-sm"
        />
        {isBase && (
          <select
            value={targetAgent}
            onChange={(e) => setTargetAgent(e.target.value as PromptKey)}
            className="h-8 rounded border border-border-subtle bg-surface-elevated px-2 text-sm"
          >
            {TARGET_OPTIONS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        )}
        <Button size="sm" onClick={runTest} disabled={!idReserva || loading}>
          {loading ? "Rodando..." : "Rodar teste"}
        </Button>
      </div>

      {error && (
        <div className="mt-3 rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-3 space-y-2 text-xs">
          <div className="flex items-center gap-3 text-muted-foreground">
            <span>status: {result.ok ? "ok" : "falha"}</span>
            <span>provider: {result.provider ?? "—"}</span>
            <span>model: {result.model ?? "—"}</span>
            <span>{result.latencyMs}ms</span>
          </div>
          <pre className="max-h-[400px] overflow-auto rounded border border-border-subtle bg-background p-3 font-mono">
{JSON.stringify(result.output ?? result.rawOutput, null, 2)}
          </pre>
        </div>
      )}
    </SurfaceCard>
  );
}
