"use client";

import { useState, useMemo } from "react";
import { computePromptDiff } from "@/lib/prompt-diff";
import { Button } from "@/components/ui/button";

type Props = {
  critical: boolean;
  oldContent: string;
  newContent: string;
  targetVersion: number;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DiffModal({
  critical,
  oldContent,
  newContent,
  targetVersion,
  onCancel,
  onConfirm,
}: Props) {
  const diff = useMemo(
    () => computePromptDiff(oldContent, newContent),
    [oldContent, newContent],
  );
  const [confirmed, setConfirmed] = useState(!critical);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
      <div className="w-full max-w-4xl rounded-lg border border-border-subtle bg-surface-elevated p-6 shadow-xl">
        <h2 className="text-lg font-semibold">Publicar v{targetVersion}?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Isso afeta a próxima análise do pipeline imediatamente. Reservas em curso continuam com a versão anterior.
        </p>

        <div className="mt-3 flex items-center gap-3 text-xs">
          <span className="text-green-500">+{diff.added} linhas</span>
          <span className="text-red-500">−{diff.removed} linhas</span>
          <span className="text-muted-foreground">
            Δ tamanho: {diff.sizeDeltaPct >= 0 ? "+" : ""}
            {diff.sizeDeltaPct.toFixed(1)}%
          </span>
        </div>

        {diff.largeReduction && (
          <div className="mt-3 rounded border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
            Atenção: prompt reduziu significativamente — verifique se nenhuma regra de negócio foi removida.
          </div>
        )}

        <div className="mt-4 max-h-[400px] overflow-auto rounded border border-border-subtle bg-background font-mono text-xs">
          {diff.parts.map((p, i) => (
            <pre
              key={i}
              className={`whitespace-pre-wrap px-2 py-0.5 ${
                p.added
                  ? "bg-green-500/10 text-green-700 dark:text-green-400"
                  : p.removed
                    ? "bg-red-500/10 text-red-700 dark:text-red-400"
                    : "text-muted-foreground"
              }`}
            >
              {p.added ? "+ " : p.removed ? "− " : "  "}
              {p.value}
            </pre>
          ))}
        </div>

        {critical && (
          <label className="mt-4 flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5"
            />
            <span>Revisei o diff e confirmo que regras de empreendimento não foram quebradas.</span>
          </label>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button disabled={!confirmed} onClick={onConfirm}>
            Publicar
          </Button>
        </div>
      </div>
    </div>
  );
}
