import Link from "next/link";
import { Topbar } from "@/components/layout/topbar";
import { SurfaceCard } from "@/components/surface-card";
import { StatusBadge } from "@/components/status-badge";
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
import { Search, Plus, ChevronRight } from "lucide-react";

const reservations = [
  {
    id: "RES-2024-001",
    client: "Tech Solutions Ltda",
    type: "Contrato de Serviço",
    value: "R$ 45.000,00",
    status: "success" as const,
    statusLabel: "Aprovado",
    date: "10 Fev 2026",
    assignee: "Ana Silva",
  },
  {
    id: "RES-2024-002",
    client: "Global Corp S.A.",
    type: "Acordo Comercial",
    value: "R$ 120.000,00",
    status: "warning" as const,
    statusLabel: "Em Revisão",
    date: "09 Fev 2026",
    assignee: "Carlos Souza",
  },
  {
    id: "RES-2024-003",
    client: "Innova Digital",
    type: "Contrato de Locação",
    value: "R$ 8.500,00",
    status: "error" as const,
    statusLabel: "Rejeitado",
    date: "08 Fev 2026",
    assignee: "Maria Santos",
  },
  {
    id: "RES-2024-004",
    client: "Alpha Investimentos",
    type: "Contrato de Parceria",
    value: "R$ 250.000,00",
    status: "success" as const,
    statusLabel: "Aprovado",
    date: "07 Fev 2026",
    assignee: "João Costa",
  },
  {
    id: "RES-2024-005",
    client: "Beta Seguros",
    type: "Apólice Empresarial",
    value: "R$ 78.000,00",
    status: "info" as const,
    statusLabel: "Processando",
    date: "07 Fev 2026",
    assignee: "Paula Lima",
  },
  {
    id: "RES-2024-006",
    client: "Omega Logística",
    type: "Contrato de Transporte",
    value: "R$ 32.000,00",
    status: "neutral" as const,
    statusLabel: "Rascunho",
    date: "06 Fev 2026",
    assignee: "Roberto Alves",
  },
  {
    id: "RES-2024-007",
    client: "Delta Consultoria",
    type: "Contrato de Assessoria",
    value: "R$ 55.000,00",
    status: "success" as const,
    statusLabel: "Aprovado",
    date: "05 Fev 2026",
    assignee: "Ana Silva",
  },
  {
    id: "RES-2024-008",
    client: "Sigma Tecnologia",
    type: "Licença de Software",
    value: "R$ 18.000,00",
    status: "warning" as const,
    statusLabel: "Em Revisão",
    date: "04 Fev 2026",
    assignee: "Carlos Souza",
  },
];

export default function ReservasPage() {
  return (
    <>
      <Topbar title="Reservas" description="Gestão de contratos e reservas" />

      <div className="mx-auto max-w-[1120px] space-y-4 px-6 py-6">
        {/* Filters Bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative max-w-[280px] flex-1">
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
                <SelectItem value="review">Em Revisão</SelectItem>
                <SelectItem value="rejected">Rejeitado</SelectItem>
                <SelectItem value="processing">Processando</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="h-8 w-[140px] border-border-subtle bg-surface-elevated text-[13px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="service">Serviço</SelectItem>
                <SelectItem value="commercial">Comercial</SelectItem>
                <SelectItem value="rental">Locação</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" className="h-8 gap-1.5 text-[13px]">
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            Nova Reserva
          </Button>
        </div>

        {/* Table */}
        <SurfaceCard elevation={1} noPadding>
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
                  Valor
                </TableHead>
                <TableHead className="text-[12px] font-medium text-text-muted">
                  Responsável
                </TableHead>
                <TableHead className="text-[12px] font-medium text-text-muted">
                  Status
                </TableHead>
                <TableHead className="pr-6 text-right text-[12px] font-medium text-text-muted">
                  Ação
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reservations.map((item) => (
                <TableRow
                  key={item.id}
                  className="group border-border-subtle hover:bg-surface-subtle/40"
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
                    <span className="text-[13px] font-medium text-text-primary tabular-nums">
                      {item.value}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-[13px] text-text-secondary">
                      {item.assignee}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={item.status}>
                      {item.statusLabel}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <Link
                      href={`/reservas/${item.id}`}
                      className="inline-flex items-center gap-1 text-[12px] font-medium text-text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-text-primary"
                    >
                      Ver
                      <ChevronRight className="h-3 w-3" strokeWidth={2} />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between border-t border-border-subtle px-6 py-3">
            <MutedText>Mostrando 8 de 1.284 resultados</MutedText>
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
      </div>
    </>
  );
}
