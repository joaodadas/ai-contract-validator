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

const atividadeRecente = [
  {
    id: "RES-2024-001",
    empresa: "Tech Solutions Ltda",
    status: "success" as const,
    statusLabel: "Aprovado",
    data: "10 Fev 2026, 14:32",
    score: 94,
  },
  {
    id: "RES-2024-002",
    empresa: "Global Corp S.A.",
    status: "pending" as const,
    statusLabel: "Pendente IA",
    data: "09 Fev 2026, 11:15",
    score: 0,
  },
  {
    id: "RES-2024-003",
    empresa: "Innova Digital",
    status: "error" as const,
    statusLabel: "Divergente",
    data: "08 Fev 2026, 09:44",
    score: 38,
  },
  {
    id: "RES-2024-004",
    empresa: "Alpha Investimentos",
    status: "success" as const,
    statusLabel: "Aprovado",
    data: "07 Fev 2026, 16:20",
    score: 89,
  },
  {
    id: "RES-2024-005",
    empresa: "Beta Seguros",
    status: "pending" as const,
    statusLabel: "Pendente IA",
    data: "07 Fev 2026, 10:00",
    score: 0,
  },
  {
    id: "RES-2024-006",
    empresa: "Omega Logística",
    status: "success" as const,
    statusLabel: "Aprovado",
    data: "06 Fev 2026, 14:55",
    score: 91,
  },
];

export default function DashboardPage() {
  return (
    <>
      <Topbar title="Dashboard" description="Visão geral de validação de contratos" />

      <PageContainer>
        {/* 3 KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            title="Total Analisados"
            value="1.284"
            description="Validações totais"
            trend={{ value: "12%", positive: true }}
            icon={<FileText className="h-4 w-4" strokeWidth={1.75} />}
            href="/reservas"
          />
          <StatCard
            title="Pendente IA"
            value="47"
            description="Aguardando análise"
            trend={{ value: "5", positive: false }}
            icon={<Clock className="h-4 w-4" strokeWidth={1.75} />}
            href="/reservas?status=pending"
          />
          <StatCard
            title="Aprovados pela IA"
            value="1.102"
            description="Taxa de aprovação: 85,8%"
            trend={{ value: "8%", positive: true }}
            icon={<CheckCircle className="h-4 w-4" strokeWidth={1.75} />}
            href="/reservas?status=approved"
          />
        </div>

        {/* Tabela de Atividade Recente */}
        <SurfaceCard elevation={1} noPadding>
          <div className="flex items-center justify-between px-6 pt-6 pb-2">
            <div>
              <SectionTitle>Atividade Recente</SectionTitle>
              <Text className="mt-1">Últimas execuções de validação</Text>
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
                  Empresa
                </TableHead>
                <TableHead className="text-[12px] font-medium text-text-muted">
                  Status
                </TableHead>
                <TableHead className="text-[12px] font-medium text-text-muted">
                  Data de Execução
                </TableHead>
                <TableHead className="pr-6 text-right text-[12px] font-medium text-text-muted">
                  Score
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {atividadeRecente.map((item) => (
                <TableRow
                  key={item.id}
                  className="group border-border-subtle hover:bg-surface-subtle/40"
                >
                  <TableCell className="pl-6">
                    <Link
                      href={`/reservas/${item.id}`}
                      className="text-[13px] font-medium text-text-primary hover:underline"
                    >
                      {item.id}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="text-[13px] text-text-primary">
                      {item.empresa}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={item.status}>
                      {item.statusLabel}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>
                    <MicroText>{item.data}</MicroText>
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <span className="text-[13px] font-medium text-text-primary tabular-nums">
                      {item.score > 0 ? item.score : "—"}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="px-6 pb-4">
            <MutedText>Mostrando 6 de 1.284 resultados</MutedText>
          </div>
        </SurfaceCard>
      </PageContainer>
    </>
  );
}
