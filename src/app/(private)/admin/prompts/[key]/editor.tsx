"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SurfaceCard } from "@/components/surface-card";
import { HistorySidebar, type VersionRow } from "./history-sidebar";
import { DiffModal } from "./diff-modal";
import { TestPanel } from "./test-panel";

type Props = {
  promptKey: string;
  label: string;
  critical: boolean;
  initialContent: string;
  activeVersion: number;
  versions: VersionRow[];
};

export function PromptEditor({
  promptKey,
  critical,
  initialContent,
  activeVersion,
  versions: initialVersions,
}: Props) {
  const [content, setContent] = useState(initialContent);
  const [notes, setNotes] = useState("");
  const [versions, setVersions] = useState<VersionRow[]>(initialVersions);
  const [loadedVersion, setLoadedVersion] = useState<number>(activeVersion);
  const [isPending, startTransition] = useTransition();
  const [diffOpen, setDiffOpen] = useState(false);
  const [pendingActivate, setPendingActivate] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const activeRow = versions.find((v) => v.isActive);
  const activeContent = activeRow?.content ?? initialContent;
  const dirty =
    content !== (versions.find((v) => v.version === loadedVersion)?.content ?? initialContent) ||
    notes.length > 0;

  async function saveDraft() {
    setStatus(null);
    const res = await fetch(`/api/admin/prompts/${promptKey}`, {
      method: "POST",
      body: JSON.stringify({ content, notes: notes || undefined }),
    });
    if (!res.ok) {
      setStatus(`Erro ao salvar: ${res.status}`);
      return;
    }
    const { version, id } = await res.json();
    setStatus(`Rascunho v${version} salvo.`);
    setLoadedVersion(version);
    setVersions((prev) => [
      {
        id,
        version,
        isActive: false,
        isDefault: false,
        content,
        notes: notes || null,
        createdAt: new Date().toISOString(),
        activatedAt: null,
      },
      ...prev,
    ]);
    setNotes("");
  }

  function openPublishFlow(versionNumber: number) {
    setPendingActivate(versionNumber);
    setDiffOpen(true);
  }

  async function confirmPublish() {
    if (pendingActivate == null) return;
    setDiffOpen(false);
    startTransition(async () => {
      const res = await fetch(`/api/admin/prompts/${promptKey}/activate`, {
        method: "POST",
        body: JSON.stringify({ version: pendingActivate }),
      });
      if (!res.ok) {
        setStatus(`Erro ao publicar: ${res.status}`);
        return;
      }
      setStatus(`v${pendingActivate} publicada.`);
      setVersions((prev) =>
        prev.map((v) => ({
          ...v,
          isActive: v.version === pendingActivate,
          activatedAt:
            v.version === pendingActivate ? new Date().toISOString() : v.activatedAt,
        })),
      );
      setPendingActivate(null);
    });
  }

  function cloneFromVersion(v: VersionRow) {
    setContent(v.content);
    setLoadedVersion(v.version);
    setStatus(
      `Carregado v${v.version} no editor. Edite e clique em "Salvar rascunho" para criar uma nova versão.`,
    );
  }

  // Candidate to publish: latest saved version that matches editor content but isn't active
  const matchingSaved = versions.find((v) => v.content === content && !v.isActive);
  const candidateToPublish = matchingSaved
    ? { version: matchingSaved.version, content }
    : loadedVersion !== activeVersion && !dirty
      ? { version: loadedVersion, content }
      : null;

  const pendingDiffContent =
    pendingActivate !== null
      ? (versions.find((v) => v.version === pendingActivate)?.content ?? content)
      : content;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-4">
        <SurfaceCard elevation={1}>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge>
                {loadedVersion === activeVersion
                  ? `ATIVA v${activeVersion}`
                  : `v${loadedVersion}`}
              </Badge>
              {critical && <Badge variant="destructive">REGRAS DE NEGÓCIO</Badge>}
              {dirty && <Badge variant="outline">não salvo</Badge>}
            </div>
            {status && <span className="text-xs text-muted-foreground">{status}</span>}
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="h-[500px] w-full rounded border border-border-subtle bg-surface-elevated p-3 font-mono text-sm"
            spellCheck={false}
          />

          <div className="mt-3">
            <Input
              placeholder="Notas (opcional) — ex: 'ajuste mãe/pai'"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Button size="sm" onClick={saveDraft} disabled={!dirty || isPending}>
              Salvar rascunho
            </Button>
            <Button
              size="sm"
              variant="default"
              disabled={!candidateToPublish || isPending}
              onClick={() => candidateToPublish && openPublishFlow(candidateToPublish.version)}
            >
              Publicar esta versão
            </Button>
          </div>
        </SurfaceCard>

        <TestPanel promptKey={promptKey} draftContent={content} />
      </div>

      <HistorySidebar
        versions={versions}
        onClone={cloneFromVersion}
        onPublish={openPublishFlow}
      />

      {diffOpen && pendingActivate !== null && (
        <DiffModal
          critical={critical}
          oldContent={activeContent}
          newContent={pendingDiffContent}
          targetVersion={pendingActivate}
          onCancel={() => {
            setDiffOpen(false);
            setPendingActivate(null);
          }}
          onConfirm={confirmPublish}
        />
      )}
    </div>
  );
}
