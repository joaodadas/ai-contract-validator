export const dynamic = "force-dynamic";

import Link from "next/link";
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
import { getReservations } from "@/db/queries";

const statusMap = {
  pending:   { variant: "pending" as const,  label: "Pendente IA" },
  approved:  { variant: "success" as const,  label: "Aprovado" },
  divergent: { variant: "error" as const,    label: "Divergente" },
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

export default async function ReservasPage() {
  const reservas = await getReservations();

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
                  Data de Execução
                </TableHead>
                <TableHead className="text-[12px] font-medium text-text-muted">
                  Score
                </TableHead>
                <TableHead className="pr-6 text-right text-[12px] font-medium text-text-muted" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {reservas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center">
                    <MutedText>Nenhuma reserva processada ainda.</MutedText>
                  </TableCell>
                </TableRow>
              )}
              {reservas.map((item) => {
                const { variant, label } = statusMap[item.status];
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
                      <StatusBadge variant={variant}>
                        {label}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      <MicroText>{formatDate(item.createdAt)}</MicroText>
                    </TableCell>
                    <TableCell>
                      <span className="text-[13px] font-medium text-text-primary tabular-nums">
                        —
                      </span>
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <Link
                        href={`/reservas/${item.externalId}`}
                        className="inline-flex items-center gap-1 text-[12px] font-medium text-accent-yellow opacity-0 transition-opacity group-hover:opacity-100 hover:text-accent-yellow/80"
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
              {reservas.length} {reservas.length === 1 ? "reserva" : "reservas"} encontrada{reservas.length === 1 ? "" : "s"}
            </MutedText>
          </div>
        </SurfaceCard>
      </PageContainer>
    </>
  );
}
