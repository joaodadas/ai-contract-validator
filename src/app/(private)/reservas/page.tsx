export const dynamic = "force-dynamic";

import Link from "next/link";
import { Suspense } from "react";
import { Topbar } from "@/components/layout/topbar";
import { SurfaceCard } from "@/components/surface-card";
import { StatusBadge } from "@/components/status-badge";
import { PageContainer } from "@/components/page-container";
import { MutedText, MicroText } from "@/components/typography";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronRight } from "lucide-react";
import {
  getFilteredReservations,
  getDistinctEnterprises,
  type ReservationFilters,
} from "@/db/queries";
import { ReservationFilters as ReservationFiltersComponent } from "@/components/reservation-filters";
import type { ReservaProcessada } from "@/lib/cvcrm/types";

const statusMap: Record<
  string,
  { variant: "pending" | "success" | "error" | "info"; label: string }
> = {
  pending: { variant: "pending", label: "Pendente IA" },
  approved: { variant: "success", label: "Aprovado IA" },
  divergent: { variant: "error", label: "Divergente" },
  confirmed: { variant: "info", label: "Confirmado" },
};

function formatDate(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ReservasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const filters: ReservationFilters = {
    search: typeof params.search === "string" ? params.search : undefined,
    status: typeof params.status === "string"
      ? (params.status as ReservationFilters["status"])
      : undefined,
    enterprise:
      typeof params.enterprise === "string" ? params.enterprise : undefined,
    dateFrom:
      typeof params.dateFrom === "string" ? params.dateFrom : undefined,
    dateTo: typeof params.dateTo === "string" ? params.dateTo : undefined,
  };

  const [reservas, enterprises] = await Promise.all([
    getFilteredReservations(filters),
    getDistinctEnterprises(),
  ]);

  return (
    <>
      <Topbar
        title="Histórico de Reservas"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Reservas" },
        ]}
      />

      <PageContainer>
        <SurfaceCard elevation={1} className="p-4">
          <Suspense fallback={null}>
            <ReservationFiltersComponent enterprises={enterprises} />
          </Suspense>
        </SurfaceCard>

        <SurfaceCard elevation={1} noPadding>
          <Table>
            <TableHeader>
              <TableRow className="border-border-subtle hover:bg-transparent">
                <TableHead className="pl-6 text-[12px] font-medium text-text-muted">
                  ID da Reserva
                </TableHead>
                <TableHead className="text-[12px] font-medium text-text-muted">
                  Titular
                </TableHead>
                <TableHead className="text-[12px] font-medium text-text-muted">
                  Empreendimento
                </TableHead>
                <TableHead className="text-[12px] font-medium text-text-muted">
                  Status
                </TableHead>
                <TableHead className="text-[12px] font-medium text-text-muted">
                  Situação CVCRM
                </TableHead>
                <TableHead className="text-[12px] font-medium text-text-muted">
                  Data
                </TableHead>
                <TableHead className="pr-6 text-right text-[12px] font-medium text-text-muted" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {reservas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center">
                    <MutedText>Nenhuma reserva encontrada.</MutedText>
                  </TableCell>
                </TableRow>
              )}
              {reservas.map((item) => {
                const s = statusMap[item.status] ?? {
                  variant: "pending" as const,
                  label: item.status,
                };
                const snapshot = item.cvcrmSnapshot as ReservaProcessada | null;
                const situacaoCv =
                  item.cvcrmSituacao ?? snapshot?.situacao ?? null;

                return (
                  <TableRow
                    key={item.id}
                    className="group border-border-subtle hover:bg-surface-subtle/40"
                  >
                    <TableCell className="pl-6">
                      <Link
                        href={`/reservas/${item.externalId}`}
                        className="text-[13px] font-medium text-text-primary hover:underline"
                      >
                        #{item.externalId}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="text-[13px] text-text-primary">
                        {item.titularNome ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-[13px] text-text-secondary">
                        {item.enterprise}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge variant={s.variant}>{s.label}</StatusBadge>
                    </TableCell>
                    <TableCell>
                      <span className="text-[12px] text-text-muted">
                        {situacaoCv ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <MicroText>{formatDate(item.createdAt)}</MicroText>
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <Link
                        href={`/reservas/${item.externalId}`}
                        className="inline-flex items-center gap-1 text-[12px] font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100 hover:text-primary/80"
                      >
                        Detalhes
                        <ChevronRight className="h-3 w-3" strokeWidth={2} />
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between border-t border-border-subtle px-6 py-3">
            <MutedText>
              {reservas.length}{" "}
              {reservas.length === 1 ? "reserva" : "reservas"} encontrada
              {reservas.length === 1 ? "" : "s"}
            </MutedText>
          </div>
        </SurfaceCard>
      </PageContainer>
    </>
  );
}
