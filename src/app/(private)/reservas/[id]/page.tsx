export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
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
import { FileText, Users, Building2, ExternalLink, ShieldCheck, ClipboardCheck, XCircle } from "lucide-react";
import { getReservationByExternalId, getLatestAuditForReservation } from "@/db/queries";
import { AnalysisProgress } from "@/components/analysis-progress";
import { ConfirmReservationButton } from "@/components/confirm-reservation-button";
import { ValidationReport } from "@/components/validation-report";
import { ExtractionDetail } from "@/components/extraction-detail";
import { JsonViewer } from "./json-viewer";
import type { ReservaProcessada, CvcrmDocumentoItem, CvcrmContrato } from "@/lib/cvcrm/types";
import type { AgentName } from "@/ai/_base/types";

const statusMap: Record<
  string,
  { variant: "pending" | "success" | "error" | "info"; label: string }
> = {
  pending:   { variant: "pending",  label: "Pendente IA" },
  approved:  { variant: "success",  label: "Aprovado IA" },
  divergent: { variant: "error",    label: "Divergente" },
  confirmed: { variant: "info",     label: "Confirmado" },
};

const docSituacaoMap: Record<string, { variant: "success" | "error" | "warning" | "neutral"; label: string }> = {
  Aprovado:   { variant: "success",  label: "Aprovado" },
  Reprovado:  { variant: "error",    label: "Reprovado" },
  Aguardando: { variant: "warning",  label: "Aguardando" },
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

function formatCPF(doc: string) {
  const d = doc.replace(/\D/g, "");
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return doc;
}

function formatPhone(phone: string) {
  return phone.replace(/^\+55/, "").replace(/(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3").trim();
}

function DocSituacaoBadge({ situacao }: { situacao: string }) {
  const s = docSituacaoMap[situacao] ?? { variant: "neutral" as const, label: situacao };
  return <StatusBadge variant={s.variant} dot={false}>{s.label}</StatusBadge>;
}

type AgentExtractionMap = Record<string, { ok: boolean; data: Record<string, unknown> | null }>;

function buildAgentExtractionMap(auditResult: Record<string, unknown> | null): AgentExtractionMap {
  if (!auditResult) return {};
  const results = auditResult.results as Array<{
    agent: string;
    ok: boolean;
    data?: Record<string, unknown>;
  }> | undefined;
  if (!results) return {};

  const map: AgentExtractionMap = {};
  for (const r of results) {
    map[r.agent] = { ok: r.ok, data: r.data ?? null };
  }
  return map;
}

function docTypeToAgent(tipo: string): AgentName | null {
  const lower = tipo.toLowerCase();
  if (lower.includes("cnh") || lower.includes("habilitação")) return "cnh-agent";
  if (lower.includes("rg") || lower.includes("cpf")) return "rgcpf-agent";
  if (lower.includes("comprovante de resid")) return "comprovante-residencia-agent";
  if (lower.includes("declaração de resid")) return "declaracao-residencia-agent";
  if (lower.includes("certidão de estado civil") || lower.includes("certidão de nascimento")) return "certidao-estado-civil-agent";
  if (lower.includes("carteira de trabalho")) return "carteira-trabalho-agent";
  if (lower.includes("comprovante de renda") || lower.includes("holerite")) return "comprovante-renda-agent";
  if (lower.includes("carta") && lower.includes("fiador")) return "carta-fiador-agent";
  return null;
}

function contractNameToAgent(name: string): AgentName | null {
  const lower = name.toLowerCase();
  if (lower.includes("quadro resumo")) return "quadro-resumo-agent";
  if (lower.includes("fluxo") || lower.includes("planilha")) return "fluxo-agent";
  if (lower.includes("memorial") || lower.includes("planta")) return "planta-agent";
  if (lower.includes("termo")) return "termo-agent";
  if (lower.includes("instrumento") || lower.includes("promessa de compra")) return "ato-agent";
  return null;
}

function PessoaCard({ titulo, nome, documento, email, telefone }: {
  titulo: string;
  nome: string;
  documento: string;
  email: string;
  telefone: string;
}) {
  return (
    <div className="space-y-2 rounded-lg bg-surface-base/50 p-4">
      <div className="flex items-center justify-between">
        <TextLabel className="text-text-muted uppercase tracking-wide text-[11px]">{titulo}</TextLabel>
      </div>
      <Text className="font-medium text-text-primary">{nome}</Text>
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
        <div>
          <MicroText className="block text-text-muted mb-0.5">CPF/CNPJ</MicroText>
          <MicroText className="text-text-secondary font-mono">{formatCPF(documento)}</MicroText>
        </div>
        <div>
          <MicroText className="block text-text-muted mb-0.5">E-mail</MicroText>
          <MicroText className="text-text-secondary">{email}</MicroText>
        </div>
        <div>
          <MicroText className="block text-text-muted mb-0.5">Telefone</MicroText>
          <MicroText className="text-text-secondary">{formatPhone(telefone)}</MicroText>
        </div>
      </div>
    </div>
  );
}

function DocumentoRow({
  doc,
  extraction,
  agentName,
}: {
  doc: CvcrmDocumentoItem;
  extraction?: { ok: boolean; data: Record<string, unknown> | null };
  agentName?: string | null;
}) {
  const inner = (
    <div className="flex items-center justify-between gap-4 rounded-md px-3 py-2.5 hover:bg-surface-base/50 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <FileText className="h-4 w-4 shrink-0 text-text-muted" strokeWidth={1.5} />
        <div className="min-w-0">
          <Text className="truncate text-text-primary text-[13px] leading-snug">{doc?.nome ?? "Documento"}</Text>
          <MicroText className="text-text-muted">{doc?.tipo ?? ""}</MicroText>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {doc?.situacao && <DocSituacaoBadge situacao={doc.situacao} />}
        {doc?.link && (
          <a
            href={doc.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-muted hover:text-text-secondary transition-colors"
            aria-label="Abrir documento"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
          </a>
        )}
      </div>
    </div>
  );

  if (agentName && extraction) {
    return (
      <ExtractionDetail agentName={agentName} data={extraction.data} ok={extraction.ok}>
        {inner}
      </ExtractionDetail>
    );
  }

  return inner;
}

function ContratoRow({
  contrato,
  extraction,
  agentName,
}: {
  contrato: CvcrmContrato;
  extraction?: { ok: boolean; data: Record<string, unknown> | null };
  agentName?: string | null;
}) {
  const inner = (
    <div className="flex items-center justify-between rounded-md px-3 py-2.5 hover:bg-surface-base/50 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <FileText className="h-4 w-4 shrink-0 text-text-muted" strokeWidth={1.5} />
        <div className="min-w-0">
          <Text className="truncate text-text-primary text-[13px] leading-snug">
            {contrato.contrato}
          </Text>
          {contrato.tipo && (
            <MicroText className="text-text-muted">{contrato.tipo}</MicroText>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {contrato.data && <MicroText className="text-text-muted">{contrato.data}</MicroText>}
        {contrato.link && (
          <a
            href={contrato.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-muted hover:text-text-secondary transition-colors"
            aria-label="Abrir contrato"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
          </a>
        )}
      </div>
    </div>
  );

  if (agentName && extraction) {
    return (
      <ExtractionDetail agentName={agentName} data={extraction.data} ok={extraction.ok}>
        {inner}
      </ExtractionDetail>
    );
  }

  return inner;
}

export default async function ReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const reserva = await getReservationByExternalId(id);

  if (!reserva) {
    notFound();
  }

  const s = statusMap[reserva.status] ?? { variant: "pending" as const, label: reserva.status };
  const snapshot = reserva.cvcrmSnapshot as ReservaProcessada | null;
  const situacaoCv = reserva.cvcrmSituacao ?? snapshot?.situacao ?? null;

  const latestAudit = await getLatestAuditForReservation(reserva.id);
  const auditResult = latestAudit?.resultJson as Record<string, unknown> | null;
  const validationData = auditResult?.validation as Record<string, unknown> | undefined;
  const formattedReport = auditResult?.formattedReport as string | undefined;
  const docCompleteness = auditResult?.documentCompleteness as { complete: boolean; missingGroups: string[]; message: string } | undefined;
  const extractionMap = buildAgentExtractionMap(auditResult);

  return (
    <>
      <Topbar
        title={`Reserva #${reserva.externalId}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Reservas", href: "/reservas" },
          { label: `#${reserva.externalId}` },
        ]}
      />

      <PageContainer>
        {/* Cabeçalho */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <PageTitle>{reserva.titularNome ?? reserva.enterprise}</PageTitle>
              <StatusBadge variant={s.variant}>{s.label}</StatusBadge>
            </div>
            <div className="flex items-center gap-3">
              <Text className="text-text-secondary">{reserva.enterprise}</Text>
              {snapshot?.planta?.numero && (
                <>
                  <span className="text-text-muted">·</span>
                  <Text className="text-text-muted">
                    {snapshot.planta.numero} — {snapshot.planta.bloco ?? ""} — Andar {snapshot.planta.andar ?? ""}
                  </Text>
                </>
              )}
              <span className="text-text-muted">·</span>
              <MicroText>{formatDate(reserva.createdAt)}</MicroText>
            </div>
            {situacaoCv && (
              <div className="flex items-center gap-2 pt-0.5">
                <MicroText className="text-text-muted">Situação CVCRM:</MicroText>
                <MicroText className="text-text-secondary font-medium">{situacaoCv}</MicroText>
              </div>
            )}
          </div>
          <div className="text-right">
            <TextLabel>Score</TextLabel>
            <span className="text-2xl font-semibold tracking-[-0.02em] text-text-muted tabular-nums">
              —
            </span>
          </div>
        </div>

        <Separator className="bg-border-subtle" />

        {/* Progresso da análise IA */}
        <AnalysisProgress
          reservationId={reserva.id}
          initialStatus={reserva.status}
        />

        {/* Relatório de Validação da IA */}
        {validationData && (
          <SurfaceCard elevation={1}>
            <SectionBlock
              title="Relatório de Validação"
              icon={<ClipboardCheck className="h-4 w-4" strokeWidth={1.75} />}
              defaultOpen
            >
              <ValidationReport
                validation={validationData as Parameters<typeof ValidationReport>[0]["validation"]}
                formattedReport={formattedReport}
              />
            </SectionBlock>
          </SurfaceCard>
        )}

        {/* Documentos Obrigatórios Faltantes */}
        {!validationData && docCompleteness && !docCompleteness.complete && (
          <div className="rounded-xl border border-status-error/20 bg-status-error/5 p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/30">
                <FileText className="h-4 w-4 text-red-500" strokeWidth={2} />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-text-primary tracking-tight">
                  Documentos Obrigatórios Faltantes
                </p>
                <p className="text-[12px] text-text-muted">
                  A validação não pôde ser executada
                </p>
              </div>
            </div>
            <div className="space-y-1.5 pl-11">
              {docCompleteness.missingGroups.map((group, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-[13px] text-red-600 dark:text-red-400"
                >
                  <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" strokeWidth={2} />
                  <span>{group}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botão de confirmação (aprovado OU divergente com override manual) */}
        {(reserva.status === "approved" || reserva.status === "divergent") && (
          <ConfirmReservationButton
            reservationId={reserva.id}
            isOverride={reserva.status === "divergent"}
          />
        )}

        {reserva.status === "confirmed" && (
          <div className="flex items-center gap-3 rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3">
            <ShieldCheck className="h-4 w-4 text-blue-600" strokeWidth={2} />
            <div className="flex-1">
              <p className="text-[13px] font-medium text-text-primary">
                Reserva confirmada manualmente
              </p>
              <p className="text-[12px] text-text-muted">
                Situação CVCRM: {situacaoCv ?? "—"}
              </p>
            </div>
          </div>
        )}

        {/* Seções */}
        <SurfaceCard elevation={1} className="space-y-4">
          {/* Documentos */}
          <SectionBlock
            title="Documentos"
            icon={<FileText className="h-4 w-4" strokeWidth={1.75} />}
            defaultOpen
          >
            {snapshot?.documentos && Object.keys(snapshot.documentos).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(snapshot.documentos).map(([grupo, docs]) => {
                  if (!Array.isArray(docs) || docs.length === 0) return null;
                  const firstDoc = docs[0];
                  const agent = firstDoc?.tipo ? docTypeToAgent(firstDoc.tipo) : null;
                  const extraction = agent ? extractionMap[agent] : undefined;

                  return (
                    <div key={grupo}>
                      <TextLabel className="uppercase tracking-wide text-[11px] text-text-muted block mb-2">
                        {grupo}
                      </TextLabel>
                      <div className="space-y-0.5">
                        {docs.map((doc, i) => (
                          <DocumentoRow
                            key={doc?.idreservasdocumentos ?? `${grupo}-${i}`}
                            doc={doc}
                            agentName={i === 0 ? agent : null}
                            extraction={i === 0 ? extraction : undefined}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-md bg-surface-base/60 px-4 py-6 text-center">
                <MutedText>Nenhum documento disponível</MutedText>
              </div>
            )}
          </SectionBlock>

          <Separator className="bg-border-subtle" />

          {/* Contratos */}
          <SectionBlock
            title="Contratos"
            icon={<Building2 className="h-4 w-4" strokeWidth={1.75} />}
            defaultOpen
          >
            {snapshot?.contratos && Array.isArray(snapshot.contratos) && snapshot.contratos.length > 0 ? (
              <div className="space-y-0.5">
                {snapshot.contratos.map((contrato, i) => {
                  if (!contrato?.contrato) return null;
                  const agent = contractNameToAgent(contrato.contrato);
                  const extraction = agent ? extractionMap[agent] : undefined;

                  return (
                    <ContratoRow
                      key={contrato.idreservacontrato ?? contrato.idcontrato ?? `contrato-${i}`}
                      contrato={contrato}
                      agentName={agent}
                      extraction={extraction}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="rounded-md bg-surface-base/60 px-4 py-6 text-center">
                <MutedText>Nenhum contrato disponível</MutedText>
              </div>
            )}
          </SectionBlock>

          <Separator className="bg-border-subtle" />

          {/* Pessoas */}
          <SectionBlock
            title="Pessoas"
            icon={<Users className="h-4 w-4" strokeWidth={1.75} />}
            defaultOpen={false}
          >
            {snapshot?.pessoas?.titular ? (
              <div className="space-y-3">
                <PessoaCard
                  titulo="Titular"
                  nome={snapshot.pessoas.titular.nome ?? "—"}
                  documento={snapshot.pessoas.titular.documento ?? "—"}
                  email={snapshot.pessoas.titular.email ?? "—"}
                  telefone={snapshot.pessoas.titular.telefone ?? "—"}
                />
                {snapshot.pessoas.associados && Object.entries(snapshot.pessoas.associados).map(([tipo, pessoa]) => (
                  <PessoaCard
                    key={tipo}
                    titulo={tipo}
                    nome={pessoa?.nome ?? "—"}
                    documento={pessoa?.documento ?? "—"}
                    email={pessoa?.email ?? "—"}
                    telefone={pessoa?.telefone ?? "—"}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-md bg-surface-base/60 px-4 py-6 text-center">
                <MutedText>Nenhuma pessoa disponível</MutedText>
              </div>
            )}
          </SectionBlock>
        </SurfaceCard>

        {/* Payload bruto do snapshot */}
        {snapshot && <JsonViewer data={snapshot} />}
      </PageContainer>
    </>
  );
}
