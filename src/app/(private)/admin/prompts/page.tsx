import Link from "next/link";
import { Topbar } from "@/components/layout/topbar";
import { PageContainer } from "@/components/page-container";
import { SurfaceCard } from "@/components/surface-card";
import { SectionTitle, SectionDescription, MutedText } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listPromptConfigs } from "@/db/queries/prompt-configs";
import { PROMPT_KEYS, PROMPT_KEY_LABELS, CRITICAL_PROMPT_KEYS } from "@/lib/prompt-keys";

export default async function PromptsListPage() {
  const rows = await listPromptConfigs();
  const byKey = new Map(rows.map((r) => [r.key, r]));

  const items = PROMPT_KEYS.map((key) => {
    const r = byKey.get(key);
    return {
      key,
      label: PROMPT_KEY_LABELS[key],
      critical: CRITICAL_PROMPT_KEYS.has(key),
      activeVersion: r?.activeVersion ?? null,
      totalVersions: r?.totalVersions ?? 0,
      lastEditedAt: r?.lastEditedAt ?? null,
      isBase: key === "extraction-base",
    };
  });

  const base = items.find((i) => i.isBase);
  const agents = items
    .filter((i) => !i.isBase)
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));

  return (
    <>
      <Topbar
        title="Prompts"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Admin" },
          { label: "Prompts" },
        ]}
      />
      <PageContainer className="space-y-6">
        <SurfaceCard elevation={1}>
          <div className="space-y-1">
            <SectionTitle>Editar prompts de extração</SectionTitle>
            <SectionDescription>
              Altere os prompts do pipeline de análise. Cada edição gera uma nova versão. Teste contra uma reserva real antes de publicar —
              a versão ativa vale para análises futuras (reservas em curso não são afetadas).
            </SectionDescription>
          </div>

          {base && (
            <SurfaceCard elevation={2} className="border-amber-500/40 bg-amber-500/5">
              <div className="flex items-center justify-between gap-4 py-2">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">PRINCIPAL</Badge>
                  <div>
                    <div className="font-medium">{base.label}</div>
                    <MutedText>
                      Aplicado antes de cada um dos 13 prompts específicos — contém as regras gerais do pipeline.
                    </MutedText>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="tabular-nums">v{base.activeVersion ?? "—"}</span>
                  <span className="text-muted-foreground tabular-nums">{base.totalVersions} versões</span>
                  <Button asChild size="sm">
                    <Link href={`/admin/prompts/${base.key}`}>Editar</Link>
                  </Button>
                </div>
              </div>
            </SurfaceCard>
          )}

          <SurfaceCard elevation={2}>
            <div className="overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2 pl-2">Agente</th>
                    <th className="py-2">Flags</th>
                    <th className="py-2 tabular-nums">Ativa</th>
                    <th className="py-2 tabular-nums">Versões</th>
                    <th className="py-2">Última edição</th>
                    <th className="py-2 pr-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((a) => (
                    <tr key={a.key} className="border-b border-border-subtle last:border-0">
                      <td className="py-2 pl-2 font-medium">{a.label}</td>
                      <td className="py-2">
                        {a.critical && <Badge variant="destructive">REGRAS DE NEGÓCIO</Badge>}
                      </td>
                      <td className="py-2 tabular-nums">v{a.activeVersion ?? "—"}</td>
                      <td className="py-2 tabular-nums">{a.totalVersions}</td>
                      <td className="py-2 text-muted-foreground">
                        {a.lastEditedAt ? new Date(a.lastEditedAt).toLocaleString("pt-BR") : "—"}
                      </td>
                      <td className="py-2 pr-2 text-right">
                        <Button asChild size="sm" variant="secondary">
                          <Link href={`/admin/prompts/${a.key}`}>Editar</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SurfaceCard>
        </SurfaceCard>
      </PageContainer>
    </>
  );
}
