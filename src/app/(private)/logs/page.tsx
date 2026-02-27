export const dynamic = "force-dynamic";

import { Topbar } from "@/components/layout/topbar";
import { SurfaceCard } from "@/components/surface-card";
import { StatusBadge } from "@/components/status-badge";
import { PageContainer } from "@/components/page-container";
import { Text, MicroText, MutedText } from "@/components/typography";
import { Info } from "lucide-react";
import { getReservations } from "@/db/queries";
import type { ReservaProcessada } from "@/lib/cvcrm/types";

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

export default async function LogsPage() {
  const reservas = await getReservations();

  return (
    <>
      <Topbar
        title="Logs do Sistema"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Logs" },
        ]}
      />

      <PageContainer>
        {/* Entradas de Log */}
        <SurfaceCard elevation={1} noPadding>
          {reservas.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <MutedText>Nenhuma reserva processada ainda.</MutedText>
            </div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {reservas.map((reserva) => {
                const snapshot = reserva.cvcrmSnapshot as ReservaProcessada | null;
                const totalDocs = snapshot?.documentos
                  ? Object.values(snapshot.documentos).reduce((sum, docs) => sum + docs.length, 0)
                  : null;
                const totalContratos = snapshot?.contratos?.length ?? null;

                const detalhes = [
                  `Titular: ${reserva.titularNome ?? "—"}`,
                  `Empreendimento: ${reserva.enterprise}`,
                  snapshot?.situacao ? `Situação CVCRM: ${snapshot.situacao}` : null,
                  snapshot?.planta
                    ? `Unidade: ${snapshot.planta.numero} — ${snapshot.planta.bloco}`
                    : null,
                  totalDocs !== null ? `Documentos: ${totalDocs}` : null,
                  totalContratos !== null ? `Contratos: ${totalContratos}` : null,
                ]
                  .filter(Boolean)
                  .join(" | ");

                return (
                  <div
                    key={reserva.id}
                    className="flex items-start gap-4 px-6 py-4 transition-colors hover:bg-surface-subtle/30"
                  >
                    <div className="flex flex-col items-center pt-0.5">
                      <Info className="h-4 w-4 text-text-muted" strokeWidth={1.75} />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Text className="font-medium">
                          Reserva #{reserva.externalId} recebida e processada
                        </Text>
                        <StatusBadge variant="info" dot={false}>
                          Info
                        </StatusBadge>
                      </div>
                      <div className="rounded-md bg-surface-inset px-2.5 py-1.5 font-mono text-[12px] leading-[18px] text-text-secondary">
                        {detalhes}
                      </div>
                      <div className="flex items-center gap-3">
                        <MicroText>{formatDate(reserva.createdAt)}</MicroText>
                        <span className="text-text-muted">·</span>
                        <MicroText className="font-mono">#{reserva.externalId}</MicroText>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="border-t border-border-subtle px-6 py-3">
            <MutedText>
              {reservas.length} {reservas.length === 1 ? "entrada" : "entradas"} de log
            </MutedText>
          </div>
        </SurfaceCard>
      </PageContainer>
    </>
  );
}
