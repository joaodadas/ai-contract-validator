import { Topbar } from "@/components/layout/topbar";
import { StatCard } from "@/components/stat-card";
import { SurfaceCard } from "@/components/surface-card";
import { StatusBadge } from "@/components/status-badge";
import { SectionTitle, Text, MutedText, MicroText } from "@/components/typography";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, CheckCircle, AlertTriangle, Clock } from "lucide-react";

const recentValidations = [
  {
    id: "RES-2024-001",
    client: "Tech Solutions Ltda",
    type: "Contrato de Serviço",
    status: "success" as const,
    statusLabel: "Aprovado",
    date: "10 Fev 2026",
    score: 94,
  },
  {
    id: "RES-2024-002",
    client: "Global Corp S.A.",
    type: "Acordo Comercial",
    status: "warning" as const,
    statusLabel: "Revisão",
    date: "09 Fev 2026",
    score: 72,
  },
  {
    id: "RES-2024-003",
    client: "Innova Digital",
    type: "Contrato de Locação",
    status: "error" as const,
    statusLabel: "Rejeitado",
    date: "08 Fev 2026",
    score: 38,
  },
  {
    id: "RES-2024-004",
    client: "Alpha Investimentos",
    type: "Contrato de Parceria",
    status: "success" as const,
    statusLabel: "Aprovado",
    date: "07 Fev 2026",
    score: 89,
  },
  {
    id: "RES-2024-005",
    client: "Beta Seguros",
    type: "Apólice Empresarial",
    status: "info" as const,
    statusLabel: "Processando",
    date: "07 Fev 2026",
    score: 0,
  },
];

export default function DashboardPage() {
  return (
    <>
      <Topbar title="Dashboard" description="Visão geral do sistema" />

      <div className="mx-auto max-w-[1120px] space-y-6 px-6 py-6">
        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total de Contratos"
            value="1.284"
            trend={{ value: "12%", positive: true }}
            description="vs. último mês"
            icon={<FileText className="h-4 w-4" strokeWidth={1.75} />}
          />
          <StatCard
            title="Aprovados"
            value="847"
            trend={{ value: "8%", positive: true }}
            description="Taxa de aprovação: 66%"
            icon={<CheckCircle className="h-4 w-4" strokeWidth={1.75} />}
          />
          <StatCard
            title="Pendentes"
            value="312"
            trend={{ value: "5%", positive: false }}
            description="Aguardando análise"
            icon={<Clock className="h-4 w-4" strokeWidth={1.75} />}
          />
          <StatCard
            title="Alertas"
            value="23"
            trend={{ value: "3%", positive: false }}
            description="Requer atenção imediata"
            icon={<AlertTriangle className="h-4 w-4" strokeWidth={1.75} />}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Recent Validations Table — 2 cols */}
          <SurfaceCard elevation={1} className="lg:col-span-2" noPadding>
            <div className="px-6 pt-6 pb-2">
              <SectionTitle>Validações Recentes</SectionTitle>
              <Text className="mt-1">Últimas análises realizadas no sistema</Text>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="border-border-subtle hover:bg-transparent">
                  <TableHead className="pl-6 text-[12px] font-medium text-text-muted">
                    Identificador
                  </TableHead>
                  <TableHead className="text-[12px] font-medium text-text-muted">
                    Cliente
                  </TableHead>
                  <TableHead className="text-[12px] font-medium text-text-muted">
                    Tipo
                  </TableHead>
                  <TableHead className="text-[12px] font-medium text-text-muted">
                    Status
                  </TableHead>
                  <TableHead className="pr-6 text-right text-[12px] font-medium text-text-muted">
                    Score
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentValidations.map((item) => (
                  <TableRow
                    key={item.id}
                    className="border-border-subtle hover:bg-surface-subtle/40"
                  >
                    <TableCell className="pl-6">
                      <span className="text-[13px] font-medium text-text-primary">
                        {item.id}
                      </span>
                      <MicroText className="block mt-0.5">{item.date}</MicroText>
                    </TableCell>
                    <TableCell>
                      <span className="text-[13px] text-text-primary">
                        {item.client}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-[13px] text-text-secondary">
                        {item.type}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge variant={item.status}>
                        {item.statusLabel}
                      </StatusBadge>
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
              <MutedText>Mostrando 5 de 1.284 resultados</MutedText>
            </div>
          </SurfaceCard>

          {/* Analytics Placeholder — 1 col */}
          <SurfaceCard elevation={1} className="flex flex-col">
            <SectionTitle>Análises</SectionTitle>
            <Text>Distribuição de contratos por status</Text>

            {/* Chart Placeholder */}
            <div className="mt-2 flex flex-1 flex-col items-center justify-center rounded-lg bg-surface-subtle px-4 py-10">
              <div className="mb-4 flex gap-2">
                {[48, 72, 56, 88, 64, 80, 44].map((h, i) => (
                  <div
                    key={i}
                    className="w-6 rounded-sm bg-text-muted/20"
                    style={{ height: `${h}px` }}
                  />
                ))}
              </div>
              <MutedText>Gráfico será implementado aqui</MutedText>
            </div>

            {/* Mini legend */}
            <div className="mt-auto flex flex-wrap gap-4 pt-2">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-status-success" />
                <MicroText>Aprovados</MicroText>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-status-warning" />
                <MicroText>Revisão</MicroText>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-status-error" />
                <MicroText>Rejeitados</MicroText>
              </div>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </>
  );
}
