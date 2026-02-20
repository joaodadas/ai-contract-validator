import { Topbar } from "@/components/layout/topbar";
import { SurfaceCard } from "@/components/surface-card";
import { StatusBadge } from "@/components/status-badge";
import { PageContainer } from "@/components/page-container";
import { Text, MicroText, MutedText } from "@/components/typography";
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
  AlertTriangle,
  CheckCircle,
  Info,
  XCircle,
} from "lucide-react";

const logs = [
  {
    id: "LOG-001",
    timestamp: "10 Fev 2026, 14:32:10",
    reserva: "RES-2024-001",
    nivel: "info" as const,
    mensagem: "Análise IA concluída com sucesso",
    detalhes: "Score: 94 | Tempo de processamento: 8,4s | Modelo: gpt-4-turbo",
  },
  {
    id: "LOG-002",
    timestamp: "10 Fev 2026, 14:32:05",
    reserva: "RES-2024-001",
    nivel: "warning" as const,
    mensagem: "Cláusula de multa excede limite configurado",
    detalhes: "Taxa de multa: 2% | Limite: 1,5% | Regra: validacao_financeira.clausula_multa",
  },
  {
    id: "LOG-003",
    timestamp: "09 Fev 2026, 11:15:22",
    reserva: "RES-2024-002",
    nivel: "info" as const,
    mensagem: "Análise enfileirada para processamento",
    detalhes: "Posição na fila: 3 | Tempo estimado: 45s",
  },
  {
    id: "LOG-004",
    timestamp: "08 Fev 2026, 09:44:18",
    reserva: "RES-2024-003",
    nivel: "error" as const,
    mensagem: "Análise encontrou divergências críticas",
    detalhes: "Regras reprovadas: 3 | Score: 38 | Críticas: completude_documentos, validacao_financeira",
  },
  {
    id: "LOG-005",
    timestamp: "08 Fev 2026, 09:44:02",
    reserva: "RES-2024-003",
    nivel: "warning" as const,
    mensagem: "Documento obrigatório ausente: Aditivo",
    detalhes: "Esperado: aditivo_contrato.pdf | Encontrado: nenhum | Regra: completude_documentos",
  },
  {
    id: "LOG-006",
    timestamp: "07 Fev 2026, 16:20:30",
    reserva: "RES-2024-004",
    nivel: "info" as const,
    mensagem: "Análise IA concluída com sucesso",
    detalhes: "Score: 89 | Tempo de processamento: 6,2s | Modelo: gpt-4-turbo",
  },
  {
    id: "LOG-007",
    timestamp: "07 Fev 2026, 10:00:15",
    reserva: "RES-2024-005",
    nivel: "info" as const,
    mensagem: "Análise enfileirada para processamento",
    detalhes: "Posição na fila: 1 | Tempo estimado: 30s",
  },
  {
    id: "LOG-008",
    timestamp: "06 Fev 2026, 14:55:42",
    reserva: "RES-2024-006",
    nivel: "info" as const,
    mensagem: "Análise IA concluída com sucesso",
    detalhes: "Score: 91 | Tempo de processamento: 7,1s | Modelo: gpt-4-turbo",
  },
];

const nivelConfig = {
  info: {
    icon: Info,
    badge: "info" as const,
    label: "Info",
  },
  warning: {
    icon: AlertTriangle,
    badge: "pending" as const,
    label: "Alerta",
  },
  error: {
    icon: XCircle,
    badge: "error" as const,
    label: "Erro",
  },
  success: {
    icon: CheckCircle,
    badge: "success" as const,
    label: "Sucesso",
  },
};

export default function LogsPage() {
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
        {/* Filtros */}
        <div className="flex items-center gap-2">
          <div className="relative max-w-[260px] flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" strokeWidth={1.75} />
            <Input
              placeholder="Buscar nos logs..."
              className="h-8 border-border-subtle bg-surface-elevated pl-8 text-[13px] placeholder:text-text-muted"
            />
          </div>
          <Select>
            <SelectTrigger className="h-8 w-[130px] border-border-subtle bg-surface-elevated text-[13px]">
              <SelectValue placeholder="Nível" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os níveis</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Alerta</SelectItem>
              <SelectItem value="error">Erro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Entradas de Log */}
        <SurfaceCard elevation={1} noPadding>
          <div className="divide-y divide-border-subtle">
            {logs.map((log) => {
              const config = nivelConfig[log.nivel];
              const Icon = config.icon;
              const isWarning = log.nivel === "warning";

              return (
                <div
                  key={log.id}
                  className="flex items-start gap-4 px-6 py-4 transition-colors hover:bg-surface-subtle/30"
                >
                  <div className="flex flex-col items-center pt-0.5">
                    <Icon
                      className={`h-4 w-4 ${
                        isWarning
                          ? "text-accent-yellow"
                          : log.nivel === "error"
                            ? "text-status-error"
                            : "text-text-muted"
                      }`}
                      strokeWidth={1.75}
                    />
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Text
                        className={`font-medium ${
                          isWarning ? "text-accent-yellow" : ""
                        }`}
                      >
                        {log.mensagem}
                      </Text>
                      <StatusBadge variant={config.badge} dot={false}>
                        {config.label}
                      </StatusBadge>
                    </div>
                    <div
                      className={`rounded-md px-2.5 py-1.5 font-mono text-[12px] leading-[18px] ${
                        isWarning
                          ? "bg-accent-yellow-soft text-accent-yellow"
                          : "bg-surface-inset text-text-secondary"
                      }`}
                    >
                      {log.detalhes}
                    </div>
                    <div className="flex items-center gap-3">
                      <MicroText>{log.timestamp}</MicroText>
                      <span className="text-text-muted">·</span>
                      <MicroText className="font-mono">{log.reserva}</MicroText>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-border-subtle px-6 py-3">
            <MutedText>Mostrando 8 entradas de log</MutedText>
          </div>
        </SurfaceCard>
      </PageContainer>
    </>
  );
}
