"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/surface-card";

export type VersionRow = {
  id: string;
  version: number;
  isActive: boolean;
  isDefault: boolean;
  content: string;
  notes: string | null;
  createdAt: string;
  activatedAt: string | null;
};

type Props = {
  versions: VersionRow[];
  onClone: (v: VersionRow) => void;
  onPublish: (version: number) => void;
};

export function HistorySidebar({ versions, onClone, onPublish }: Props) {
  return (
    <SurfaceCard elevation={1} className="h-fit space-y-2">
      <div className="text-sm font-semibold">Histórico</div>
      {versions.length === 0 && (
        <div className="text-xs text-muted-foreground">Sem versões ainda.</div>
      )}
      <ul className="space-y-2">
        {versions.map((v) => (
          <li
            key={v.id}
            className="rounded border border-border-subtle bg-surface-elevated p-2 text-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="font-mono">v{v.version}</span>
                {v.isActive && <Badge variant="secondary">ATIVA</Badge>}
                {v.isDefault && <Badge variant="outline">DEFAULT</Badge>}
              </div>
              <span className="text-muted-foreground">
                {new Date(v.createdAt).toLocaleDateString("pt-BR")}
              </span>
            </div>
            {v.notes && (
              <div className="mt-1 text-muted-foreground">&ldquo;{v.notes}&rdquo;</div>
            )}
            <div className="mt-2 flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => onClone(v)}>
                Clonar
              </Button>
              {!v.isActive && (
                <Button size="sm" variant="ghost" onClick={() => onPublish(v.version)}>
                  Publicar
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </SurfaceCard>
  );
}
