export const dynamic = "force-dynamic";

import Link from "next/link";
import { Topbar } from "@/components/layout/topbar";
import { StatCard } from "@/components/stat-card";
import { SurfaceCard } from "@/components/surface-card";
import { StatusBadge } from "@/components/status-badge";
import { PageContainer } from "@/components/page-container";
import { SectionTitle, Text, MutedText, MicroText } from "@/components/typography";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, CheckCircle, Clock, ChevronRight } from "lucide-react";
import { getReservationStats, getRecentReservations } from "@/db/queries";

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

export default async function DashboardPage() {
  const [stats, recentes] = await Promise.all([
    getReservationStats(),
    getRecentReservations(6),
  ]);

  const taxaAprovacao =
    stats.total > 0
      ? ((stats.approved / stats.total) * 100).toFixed(1)
      : "0";

  return (
    <>
      <Topbar title="Dashboard" description="Visão geral de validação de contratos" />

      <PageContainer>
        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            title="Total Analisados"
            value={stats.total.toLocaleString("pt-BR")}
            description="Reservas recebidas"
            icon={<FileText className="h-4 w-4" strokeWidth={1.75} />}
            href="/reservas"
          />
          <StatCard
            title="Pendente IA"
            value={stats.pending.toLocaleString("pt-BR")}
            description="Aguardando análise"
            icon={<Clock className="h-4 w-4" strokeWidth={1.75} />}
            href="/reservas"
          />
          <StatCard
            title="Aprovados pela IA"
            value={stats.approved.toLocaleString("pt-BR")}
            description={`Taxa de aprovação: ${taxaAprovacao}%`}
            icon={<CheckCircle className="h-4 w-4" strokeWidth={1.75} />}
            href="/reservas"
          />
        </div>

        {/* Tabela de Atividade Recente */}
        <SurfaceCard elevation={1} noPadding>
          <div className="flex items-center justify-between px-6 pt-6 pb-2">
            <div>
              <SectionTitle>Atividade Recente</SectionTitle>
              <Text className="mt-1">Últimas reservas recebidas</Text>
            </div>
            <Link
              href="/reservas"
              className="flex items-center gap-1 text-[13px] font-medium text-accent-yellow transition-colors hover:text-accent-yellow/80"
            >
              Ver tudo
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
            </Link>
          </div>
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
                <TableHead className="pr-6 text-right text-[12px] font-medium text-text-muted">
                  Data de Recebimento
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center">
                    <MutedText>Nenhuma reserva recebida ainda.</MutedText>
                  </TableCell>
                </TableRow>
              )}
              {recentes.map((item) => {
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
                      <StatusBadge variant={variant}>{label}</StatusBadge>
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <MicroText>{formatDate(item.createdAt)}</MicroText>
                        <ChevronRight className="h-3 w-3 text-accent-yellow opacity-0 transition-opacity group-hover:opacity-100" strokeWidth={2} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between border-t border-border-subtle px-6 py-3">
            <MutedText>
              Mostrando {recentes.length} de {stats.total.toLocaleString("pt-BR")} reservas
            </MutedText>
          </div>
        </SurfaceCard>
      </PageContainer>
    </>
  );
}
