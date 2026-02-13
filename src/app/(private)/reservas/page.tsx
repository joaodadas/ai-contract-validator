import Link from "next/link";
import { Topbar } from "@/components/layout/topbar";
import { SurfaceCard } from "@/components/surface-card";
import { StatusBadge } from "@/components/status-badge";
import { PageContainer } from "@/components/page-container";
import { MutedText, MicroText } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, ChevronRight } from "lucide-react";

type StatusReserva = "success" | "pending" | "error";

const reservas: {
  id: string;
  empresa: string;
  status: StatusReserva;
  statusLabel: string;
  dataExecucao: string;
  score: number;
}[] = [
  {
    id: "RES-2024-001",
    empresa: "Tech Solutions Ltda",
    status: "success",
    statusLabel: "Aprovado",
    dataExecucao: "10 Fev 2026, 14:32",
    score: 94,
  },
  {
    id: "RES-2024-002",
    empresa: "Global Corp S.A.",
    status: "pending",
    statusLabel: "Pendente IA",
    dataExecucao: "09 Fev 2026, 11:15",
    score: 0,
  },
  {
    id: "RES-2024-003",
    empresa: "Innova Digital",
    status: "error",
    statusLabel: "Divergente",
    dataExecucao: "08 Fev 2026, 09:44",
    score: 38,
  },
  {
    id: "RES-2024-004",
    empresa: "Alpha Investimentos",
    status: "success",
    statusLabel: "Aprovado",
    dataExecucao: "07 Fev 2026, 16:20",
    score: 89,
  },
  {
    id: "RES-2024-005",
    empresa: "Beta Seguros",
    status: "pending",
    statusLabel: "Pendente IA",
    dataExecucao: "07 Fev 2026, 10:00",
    score: 0,
  },
  {
    id: "RES-2024-006",
    empresa: "Omega Logística",
    status: "success",
    statusLabel: "Aprovado",
    dataExecucao: "06 Fev 2026, 14:55",
    score: 91,
  },
  {
    id: "RES-2024-007",
    empresa: "Delta Consultoria",
    status: "success",
    statusLabel: "Aprovado",
    dataExecucao: "05 Fev 2026, 08:30",
    score: 87,
  },
  {
    id: "RES-2024-008",
    empresa: "Sigma Tecnologia",
    status: "error",
    statusLabel: "Divergente",
    dataExecucao: "04 Fev 2026, 17:12",
    score: 42,
  },
  {
    id: "RES-2024-009",
    empresa: "Lambda Pharma",
    status: "pending",
    statusLabel: "Pendente IA",
    dataExecucao: "04 Fev 2026, 09:00",
    score: 0,
  },
  {
    id: "RES-2024-010",
    empresa: "Kappa Mining",
    status: "success",
    statusLabel: "Aprovado",
    dataExecucao: "03 Fev 2026, 15:45",
    score: 96,
  },
];

export default function ReservasPage() {
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
        {/* Filtros */}
        <div className="flex items-center gap-2">
          <div className="relative max-w-[260px] flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" strokeWidth={1.75} />
            <Input
              placeholder="Buscar reservas..."
              className="h-8 border-border-subtle bg-surface-elevated pl-8 text-[13px] placeholder:text-text-muted"
            />
          </div>
          <Select>
            <SelectTrigger className="h-8 w-[140px] border-border-subtle bg-surface-elevated text-[13px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="approved">Aprovado</SelectItem>
              <SelectItem value="pending">Pendente IA</SelectItem>
              <SelectItem value="divergent">Divergente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabela */}
        <SurfaceCard elevation={1} noPadding>
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
                <TableHead className="text-[12px] font-medium text-text-muted">
                  Score
                </TableHead>
                <TableHead className="pr-6 text-right text-[12px] font-medium text-text-muted" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {reservas.map((item) => (
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
                    <MicroText>{item.dataExecucao}</MicroText>
                  </TableCell>
                  <TableCell>
                    <span className="text-[13px] font-medium text-text-primary tabular-nums">
                      {item.score > 0 ? item.score : "—"}
                    </span>
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <Link
                      href={`/reservas/${item.id}`}
                      className="inline-flex items-center gap-1 text-[12px] font-medium text-accent-yellow opacity-0 transition-opacity group-hover:opacity-100 hover:text-accent-yellow/80"
                    >
                      Detalhes
                      <ChevronRight className="h-3 w-3" strokeWidth={2} />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between border-t border-border-subtle px-6 py-3">
            <MutedText>Mostrando 10 de 1.284 resultados</MutedText>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="h-7 border-border-subtle text-[12px]">
                Anterior
              </Button>
              <Button variant="outline" size="sm" className="h-7 border-border-subtle text-[12px]">
                Próximo
              </Button>
            </div>
          </div>
        </SurfaceCard>
      </PageContainer>
    </>
  );
}
