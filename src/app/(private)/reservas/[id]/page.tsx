"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Topbar } from "@/components/layout/topbar";
import { SurfaceCard } from "@/components/surface-card";
import { StatusBadge } from "@/components/status-badge";
import { SectionBlock } from "@/components/section-block";
import { PageContainer } from "@/components/page-container";
import {
  PageTitle,
  Text,
  MutedText,
  MicroText,
  TextLabel,
} from "@/components/typography";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  FileText,
  Users,
  Brain,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";

/* ---------- Dados Mock ---------- */
const mockReservation = {
  id: "RES-2024-001",
  empresa: "Tech Solutions Ltda",
  tipoContrato: "Contrato de Serviço",
  status: "success" as const,
  statusLabel: "Aprovado",
  dataExecucao: "10 Fev 2026, 14:32",
  score: 94,
  financeiro: {
    valorTotal: "R$ 450.000,00",
    condicoesPagamento: "30/60/90 dias",
    clausulaMulta: "2% ao mês",
    imposto: "ISS 5%",
  },
  documentos: [
    { nome: "Contrato_v3.pdf", tamanho: "2,4 MB", status: "Validado" },
    { nome: "Aditivo_01.pdf", tamanho: "340 KB", status: "Validado" },
    { nome: "Relatorio_Financeiro.xlsx", tamanho: "1,1 MB", status: "Pendente" },
  ],
  pessoas: [
    { nome: "Carlos Mendes", cargo: "CFO", statusAssinatura: "Assinado" },
    { nome: "Ana Paula Vieira", cargo: "Diretora Jurídica", statusAssinatura: "Assinado" },
    { nome: "Ricardo Santos", cargo: "Controller", statusAssinatura: "Pendente" },
  ],
  logs: [
    {
      timestamp: "14:32:01",
      mensagem: "Análise IA iniciada",
      nivel: "info",
    },
    {
      timestamp: "14:32:04",
      mensagem: "Validação de cláusula financeira: APROVADO",
      nivel: "success",
    },
    {
      timestamp: "14:32:05",
      mensagem: "Cláusula de multa excede limite: 2% > 1,5% configurado",
      nivel: "warning",
    },
    {
      timestamp: "14:32:08",
      mensagem: "Validação de assinatura de documentos: APROVADO",
      nivel: "success",
    },
    {
      timestamp: "14:32:10",
      mensagem: "Análise concluída com score 94",
      nivel: "info",
    },
  ],
  auditPayload: {
    analysisId: "AUD-2024-001",
    modelVersion: "gpt-4-turbo-2024-01-25",
    inputTokens: 12480,
    outputTokens: 3280,
    rules: {
      financial_validation: {
        result: "pass",
        confidence: 0.97,
        details: "Todos os termos financeiros dentro da faixa aceitável",
      },
      penalty_clause: {
        result: "warning",
        confidence: 0.82,
        details: "Taxa de multa 2% excede o limite configurado de 1,5%",
      },
      document_completeness: {
        result: "pass",
        confidence: 0.99,
        details: "Todos os documentos obrigatórios presentes",
      },
    },
    metadata: {
      processingTime: "8,4s",
      region: "us-east-1",
    },
  },
};

/* ---------- JSON Viewer Component ---------- */
function JsonViewer({ data }: { data: unknown }) {
  const renderValue = (value: unknown, indent: number): React.ReactNode => {
    if (typeof value === "string") {
      const isWarning = value.toLowerCase().includes("warning");
      return (
        <span className={isWarning ? "text-accent-yellow font-medium" : "text-status-info"}>
          &quot;{value}&quot;
        </span>
      );
    }
    if (typeof value === "number")
      return <span className="text-status-success">{value}</span>;
    if (typeof value === "boolean")
      return <span className="text-status-warning">{String(value)}</span>;
    if (value === null) return <span className="text-text-muted">null</span>;
    if (Array.isArray(value)) {
      return (
        <span>
          [
          {value.map((item, i) => (
            <span key={i}>
              {"\n" + " ".repeat(indent + 2)}
              {renderValue(item, indent + 2)}
              {i < value.length - 1 && ","}
            </span>
          ))}
          {"\n" + " ".repeat(indent)}]
        </span>
      );
    }
    if (typeof value === "object" && value !== null) {
      const entries = Object.entries(value);
      return (
        <span>
          {"{"}
          {entries.map(([key, val], i) => (
            <span key={key}>
              {"\n" + " ".repeat(indent + 2)}
              <span className="text-text-secondary">&quot;{key}&quot;</span>
              <span className="text-text-muted">: </span>
              {renderValue(val, indent + 2)}
              {i < entries.length - 1 && ","}
            </span>
          ))}
          {"\n" + " ".repeat(indent)}
          {"}"}
        </span>
      );
    }
    return <span>{String(value)}</span>;
  };

  return (
    <div className="overflow-x-auto rounded-lg bg-surface-inset p-4">
      <pre className="font-mono text-[12px] leading-[20px] text-text-primary">
        {renderValue(data, 0)}
      </pre>
    </div>
  );
}

/* ---------- Página ---------- */
export default function ReservationDetailPage() {
  const params = useParams();
  const reserva = mockReservation;
  const [showAudit, setShowAudit] = useState(false);

  return (
    <>
      <Topbar
        title={`Reserva ${params.id}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Reservas", href: "/reservas" },
          { label: String(params.id) },
        ]}
      />

      <PageContainer>
        {/* Cabeçalho */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <PageTitle>{reserva.empresa}</PageTitle>
              <StatusBadge variant={reserva.status}>
                {reserva.statusLabel}
              </StatusBadge>
            </div>
            <div className="flex items-center gap-3">
              <Text className="text-text-secondary">
                {reserva.tipoContrato}
              </Text>
              <span className="text-text-muted">·</span>
              <MicroText>{reserva.dataExecucao}</MicroText>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <TextLabel>Score</TextLabel>
              <span className="text-2xl font-semibold tracking-[-0.02em] text-accent-yellow tabular-nums">
                {reserva.score}
              </span>
            </div>
          </div>
        </div>

        <Separator className="bg-border-subtle" />

        {/* Card Principal com Seções Colapsáveis */}
        <SurfaceCard elevation={1} className="space-y-4">
          {/* Financeiro */}
          <SectionBlock
            title="Financeiro"
            icon={<DollarSign className="h-4 w-4" strokeWidth={1.75} />}
            defaultOpen
          >
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              <div>
                <TextLabel>Valor Total</TextLabel>
                <Text className="mt-1 font-medium">
                  {reserva.financeiro.valorTotal}
                </Text>
              </div>
              <div>
                <TextLabel>Condições de Pagamento</TextLabel>
                <Text className="mt-1 font-medium">
                  {reserva.financeiro.condicoesPagamento}
                </Text>
              </div>
              <div>
                <TextLabel>Cláusula de Multa</TextLabel>
                <Text className="mt-1 font-medium">
                  {reserva.financeiro.clausulaMulta}
                </Text>
              </div>
              <div>
                <TextLabel>Imposto</TextLabel>
                <Text className="mt-1 font-medium">
                  {reserva.financeiro.imposto}
                </Text>
              </div>
            </div>
          </SectionBlock>

          <Separator className="bg-border-subtle" />

          {/* Documentos */}
          <SectionBlock
            title="Documentos"
            icon={<FileText className="h-4 w-4" strokeWidth={1.75} />}
            defaultOpen
          >
            <div className="space-y-2">
              {reserva.documentos.map((doc) => (
                <div
                  key={doc.nome}
                  className="flex items-center justify-between rounded-md bg-surface-base/60 px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-text-muted" strokeWidth={1.5} />
                    <div>
                      <Text className="font-medium">{doc.nome}</Text>
                      <MicroText>{doc.tamanho}</MicroText>
                    </div>
                  </div>
                  <StatusBadge
                    variant={doc.status === "Validado" ? "success" : "pending"}
                    dot={false}
                  >
                    {doc.status}
                  </StatusBadge>
                </div>
              ))}
            </div>
          </SectionBlock>

          <Separator className="bg-border-subtle" />

          {/* Pessoas */}
          <SectionBlock
            title="Pessoas"
            icon={<Users className="h-4 w-4" strokeWidth={1.75} />}
            defaultOpen={false}
          >
            <div className="space-y-2">
              {reserva.pessoas.map((pessoa) => (
                <div
                  key={pessoa.nome}
                  className="flex items-center justify-between rounded-md bg-surface-base/60 px-3 py-2"
                >
                  <div>
                    <Text className="font-medium">{pessoa.nome}</Text>
                    <MicroText>{pessoa.cargo}</MicroText>
                  </div>
                  <StatusBadge
                    variant={pessoa.statusAssinatura === "Assinado" ? "success" : "pending"}
                    dot={false}
                  >
                    {pessoa.statusAssinatura}
                  </StatusBadge>
                </div>
              ))}
            </div>
          </SectionBlock>

          <Separator className="bg-border-subtle" />

          {/* Logs da IA */}
          <SectionBlock
            title="Logs da IA"
            icon={<Brain className="h-4 w-4" strokeWidth={1.75} />}
            defaultOpen={false}
          >
            <div className="space-y-1">
              {reserva.logs.map((log, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-md px-2 py-1.5"
                >
                  <MicroText className="shrink-0 font-mono tabular-nums">
                    {log.timestamp}
                  </MicroText>
                  {log.nivel === "warning" ? (
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-accent-yellow" strokeWidth={2} />
                  ) : (
                    <span
                      className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                        log.nivel === "success"
                          ? "bg-status-success"
                          : "bg-status-info"
                      }`}
                    />
                  )}
                  <Text
                    className={
                      log.nivel === "warning"
                        ? "text-accent-yellow"
                        : undefined
                    }
                  >
                    {log.mensagem}
                  </Text>
                </div>
              ))}
            </div>
          </SectionBlock>
        </SurfaceCard>

        {/* Detalhe de Auditoria */}
        <SurfaceCard elevation={1}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-text-muted" strokeWidth={1.75} />
              <Text className="font-semibold text-text-primary">Payload de Auditoria</Text>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-[12px] font-medium text-text-muted"
              onClick={() => setShowAudit(!showAudit)}
            >
              <span className="text-accent-yellow">{showAudit ? "Recolher" : "Expandir"}</span> JSON
              <ChevronDown
                className={`h-3 w-3 transition-transform ${showAudit ? "rotate-180" : ""}`}
                strokeWidth={2}
              />
            </Button>
          </div>
          {showAudit && (
            <div className="mt-3 animate-in fade-in-0 slide-in-from-top-1 duration-200">
              <JsonViewer data={reserva.auditPayload} />
            </div>
          )}
        </SurfaceCard>
      </PageContainer>
    </>
  );
}
