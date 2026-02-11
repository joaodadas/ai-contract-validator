"use client";

import { useState } from "react";
import { Topbar } from "@/components/layout/topbar";
import { SurfaceCard } from "@/components/surface-card";
import { StatusBadge } from "@/components/status-badge";
import {
  SectionTitle,
  Text,
  TextLabel,
  MutedText,
  MicroText,
} from "@/components/typography";
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
  Search,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Zap,
} from "lucide-react";

interface LogEntry {
  id: string;
  timestamp: string;
  type: "validation" | "approval" | "rejection" | "system" | "override";
  status: "success" | "error" | "warning" | "info";
  title: string;
  description: string;
  actor: string;
  reservationId: string;
  duration: string;
  payload: string;
}

const logEntries: LogEntry[] = [
  {
    id: "log-001",
    timestamp: "10 Fev 2026, 14:32:15",
    type: "approval",
    status: "success",
    title: "Contrato aprovado automaticamente",
    description: "Score 94/100 — Acima do limite de aprovação (80).",
    actor: "Sistema — Motor de Regras v2.4",
    reservationId: "RES-2024-001",
    duration: "1.2s",
    payload: JSON.stringify(
      {
        reservation_id: "RES-2024-001",
        score: 94,
        threshold: 80,
        rules_applied: ["finance_check", "document_validation", "credit_analysis"],
        result: "APPROVED",
        timestamp: "2026-02-10T14:32:15.000Z",
      },
      null,
      2
    ),
  },
  {
    id: "log-002",
    timestamp: "10 Fev 2026, 13:45:22",
    type: "validation",
    status: "success",
    title: "Documento validado com sucesso",
    description: "Anexo_Financeiro.pdf — Formato válido, dados extraídos.",
    actor: "Ana Silva",
    reservationId: "RES-2024-001",
    duration: "3.8s",
    payload: JSON.stringify(
      {
        document: "Anexo_Financeiro.pdf",
        type: "financial_attachment",
        validation: { format: "valid", signature: "valid", expiry: "2026-08-10" },
        extracted_data: { total_value: 45000, currency: "BRL" },
      },
      null,
      2
    ),
  },
  {
    id: "log-003",
    timestamp: "09 Fev 2026, 16:20:00",
    type: "rejection",
    status: "error",
    title: "Contrato rejeitado — Score insuficiente",
    description: "Score 38/100 — Abaixo do limite mínimo (50).",
    actor: "Sistema — Motor de Regras v2.4",
    reservationId: "RES-2024-003",
    duration: "0.8s",
    payload: JSON.stringify(
      {
        reservation_id: "RES-2024-003",
        score: 38,
        threshold: 50,
        failures: ["credit_score_low", "missing_documents", "no_guarantee"],
        result: "REJECTED",
      },
      null,
      2
    ),
  },
  {
    id: "log-004",
    timestamp: "09 Fev 2026, 10:00:45",
    type: "system",
    status: "warning",
    title: "Alerta: Certidão negativa expirada",
    description: "Certidao_Negativa.pdf expirou em 01/02/2026.",
    actor: "Sistema — Monitor de Documentos",
    reservationId: "RES-2024-001",
    duration: "0.2s",
    payload: JSON.stringify(
      {
        document: "Certidao_Negativa.pdf",
        expiry_date: "2026-02-01",
        detected_at: "2026-02-09T10:00:45.000Z",
        action: "NOTIFICATION_SENT",
        notified: ["ana.silva@lyx.com.br"],
      },
      null,
      2
    ),
  },
  {
    id: "log-005",
    timestamp: "08 Fev 2026, 09:15:30",
    type: "system",
    status: "info",
    title: "Nova reserva criada",
    description: "RES-2024-001 — Tech Solutions Ltda — R$ 45.000,00",
    actor: "João Costa",
    reservationId: "RES-2024-001",
    duration: "0.5s",
    payload: JSON.stringify(
      {
        reservation_id: "RES-2024-001",
        client: "Tech Solutions Ltda",
        type: "service_contract",
        value: 45000,
        created_by: "joao.costa@lyx.com.br",
      },
      null,
      2
    ),
  },
  {
    id: "log-006",
    timestamp: "07 Fev 2026, 17:42:10",
    type: "override",
    status: "warning",
    title: "Override manual aplicado",
    description: "Aprovação forçada por gerente — Score original: 62.",
    actor: "Carlos Souza — Gerente",
    reservationId: "RES-2024-004",
    duration: "—",
    payload: JSON.stringify(
      {
        reservation_id: "RES-2024-004",
        original_score: 62,
        override_by: "carlos.souza@lyx.com.br",
        role: "manager",
        reason: "Cliente VIP com histórico positivo",
        result: "APPROVED_OVERRIDE",
      },
      null,
      2
    ),
  },
];

const typeIcons = {
  validation: CheckCircle,
  approval: CheckCircle,
  rejection: XCircle,
  system: Zap,
  override: AlertTriangle,
};

function LogCard({ entry }: { entry: LogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = typeIcons[entry.type];

  return (
    <SurfaceCard elevation={1} className="gap-0 p-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start gap-4 rounded-xl p-5 text-left transition-colors hover:bg-surface-subtle/30"
      >
        {/* Timeline indicator */}
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-subtle">
          <Icon
            className={`h-4 w-4 text-status-${entry.status}`}
            strokeWidth={1.75}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-3">
            <span className="text-[14px] font-medium text-text-primary">
              {entry.title}
            </span>
            <div className="flex shrink-0 items-center gap-2">
              <StatusBadge variant={entry.status} dot={false}>
                {entry.reservationId}
              </StatusBadge>
              {expanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-text-muted" strokeWidth={1.75} />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-text-muted" strokeWidth={1.75} />
              )}
            </div>
          </div>
          <MutedText>{entry.description}</MutedText>
          <div className="flex items-center gap-3">
            <MicroText>{entry.actor}</MicroText>
            <span className="text-text-muted">·</span>
            <MicroText>{entry.timestamp}</MicroText>
            <span className="text-text-muted">·</span>
            <MicroText>
              <Clock className="mr-0.5 inline h-3 w-3" strokeWidth={1.75} />
              {entry.duration}
            </MicroText>
          </div>
        </div>
      </button>

      {/* Expandable JSON Viewer */}
      {expanded && (
        <div className="border-t border-border-subtle px-5 pb-5">
          <div className="mt-4 space-y-2">
            <TextLabel>Payload da Execução</TextLabel>
            <div className="overflow-x-auto rounded-lg bg-surface-inset p-4">
              <pre className="text-[12px] leading-[18px] text-text-secondary font-mono">
                {entry.payload}
              </pre>
            </div>
          </div>
        </div>
      )}
    </SurfaceCard>
  );
}

export default function LogsPage() {
  return (
    <>
      <Topbar title="Logs" description="Histórico de execuções do sistema" />

      <div className="mx-auto max-w-[1120px] space-y-4 px-6 py-6">
        {/* Filters */}
        <div className="flex items-center gap-2">
          <div className="relative max-w-[280px] flex-1">
            <Search
              className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
              strokeWidth={1.75}
            />
            <Input
              placeholder="Buscar nos logs..."
              className="h-8 border-border-subtle bg-surface-elevated pl-8 text-[13px] placeholder:text-text-muted"
            />
          </div>
          <Select>
            <SelectTrigger className="h-8 w-[140px] border-border-subtle bg-surface-elevated text-[13px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="validation">Validação</SelectItem>
              <SelectItem value="approval">Aprovação</SelectItem>
              <SelectItem value="rejection">Rejeição</SelectItem>
              <SelectItem value="system">Sistema</SelectItem>
              <SelectItem value="override">Override</SelectItem>
            </SelectContent>
          </Select>
          <Select>
            <SelectTrigger className="h-8 w-[140px] border-border-subtle bg-surface-elevated text-[13px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="success">Sucesso</SelectItem>
              <SelectItem value="warning">Alerta</SelectItem>
              <SelectItem value="error">Erro</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Timeline */}
        <div className="relative space-y-3">
          {/* Vertical timeline line */}
          <div className="absolute left-[39px] top-6 bottom-6 w-px bg-border-subtle" />

          {logEntries.map((entry) => (
            <LogCard key={entry.id} entry={entry} />
          ))}
        </div>

        {/* Load more */}
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-border-subtle text-[13px]"
          >
            Carregar mais logs
          </Button>
        </div>
      </div>
    </>
  );
}
