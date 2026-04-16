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
import { FileText, Users, Building2, ExternalLink, ShieldCheck, ClipboardCheck, XCircle, CheckCircle2, Circle, AlertTriangle, Clock } from "lucide-react";
import { getReservationByExternalId, getLatestAuditForReservation } from "@/db/queries";
import { AnalysisProgress } from "@/components/analysis-progress";
import { ConfirmReservationButton } from "@/components/confirm-reservation-button";
import { ReprocessReservationButton } from "@/components/reprocess-reservation-button";
import { ValidationReport } from "@/components/validation-report";
import { ExtractionDetail } from "@/components/extraction-detail";
import { JsonViewer } from "./json-viewer";
import type { ReservaProcessada, CvcrmDocumentoItem, CvcrmContrato, Pessoa } from "@/lib/cvcrm/types";
import { docTypeToAgent, contractNameToAgent } from "@/lib/cvcrm/constants";

const CVCRM_STAGES = [
  { id: "analise", label: "Em Análise", description: "IA processando documentos" },
  { id: "validado", label: "Validado", situacaoIds: [38], description: "Contrato aprovado pela IA" },
  { id: "pendencia", label: "Pendência", situacaoIds: [39], description: "Divergências encontradas" },
  { id: "docs_faltando", label: "Docs Faltantes", situacaoIds: [40], description: "Documentos obrigatórios ausentes" },
  { id: "confirmado", label: "Confirmado", description: "Aprovado por auditor humano" },
] as const;

function CvcrmStageStepper({ situacao, status }: { situacao: string | null; status: string }) {
  // Determine active stage based on reservation status + CVCRM situação
  let activeStageId: string;
  if (status === "pending") {
    activeStageId = "analise";
  } else if (status === "confirmed") {
    activeStageId = "confirmado";
  } else if (situacao?.includes("Validado") || situacao?.includes("38")) {
    activeStageId = "validado";
  } else if (situacao?.includes("Faltante") || situacao?.includes("40")) {
    activeStageId = "docs_faltando";
  } else {
    activeStageId = "pendencia";
  }

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-elevated/50 px-5 py-4">
      <div className="flex items-center gap-1">
        {CVCRM_STAGES.map((stage, i) => {
          const isActive = stage.id === activeStageId;
          const isPast = CVCRM_STAGES.findIndex(s => s.id === activeStageId) > i;
          const isLast = i === CVCRM_STAGES.length - 1;

          return (
            <div key={stage.id} className="flex items-center flex-1 min-w-0">
              <div className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-colors ${
                isActive
                  ? "bg-primary/8 border border-primary/20"
                  : isPast
                    ? "opacity-50"
                    : "opacity-30"
              }`}>
                {isActive ? (
                  stage.id === "pendencia" || stage.id === "docs_faltando" ? (
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" strokeWidth={2} />
                  ) : stage.id === "analise" ? (
                    <Clock className="h-4 w-4 text-primary shrink-0 animate-pulse" strokeWidth={2} />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-status-success shrink-0" strokeWidth={2} />
                  )
                ) : isPast ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-text-muted shrink-0" strokeWidth={2} />
                ) : (
                  <Circle className="h-3.5 w-3.5 text-text-muted shrink-0" strokeWidth={1.5} />
                )}
                <div className="min-w-0">
                  <p className={`text-[12px] font-medium leading-tight truncate ${
                    isActive ? "text-text-primary" : "text-text-muted"
                  }`}>
                    {stage.label}
                  </p>
                  {isActive && (
                    <p className="text-[10px] text-text-muted leading-tight mt-0.5 truncate">
                      {stage.description}
                    </p>
                  )}
                </div>
              </div>
              {!isLast && (
                <div className={`h-px flex-1 mx-1 ${isPast ? "bg-text-muted/30" : "bg-border-subtle"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

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


function PessoaCard({ titulo, pessoa }: {
  titulo: string;
  pessoa: Pessoa;
}) {
  return (
    <div className="space-y-2 rounded-lg bg-surface-base/50 p-4">
      <div className="flex items-center justify-between">
        <TextLabel className="text-text-muted uppercase tracking-wide text-[11px]">{titulo}</TextLabel>
      </div>
      <Text className="font-medium text-text-primary">{pessoa.nome ?? "—"}</Text>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
        <div>
          <MicroText className="block text-text-muted mb-0.5">CPF/CNPJ</MicroText>
          <MicroText className="text-text-secondary font-mono">{formatCPF(pessoa.documento ?? "—")}</MicroText>
        </div>
        {pessoa.rg && (
          <div>
            <MicroText className="block text-text-muted mb-0.5">RG</MicroText>
            <MicroText className="text-text-secondary font-mono">{pessoa.rg}{pessoa.rg_orgao_emissor ? ` (${pessoa.rg_orgao_emissor})` : ""}</MicroText>
          </div>
        )}
        <div>
          <MicroText className="block text-text-muted mb-0.5">E-mail</MicroText>
          <MicroText className="text-text-secondary">{pessoa.email ?? "—"}</MicroText>
        </div>
        <div>
          <MicroText className="block text-text-muted mb-0.5">Telefone</MicroText>
          <MicroText className="text-text-secondary">{formatPhone(pessoa.telefone ?? "—")}</MicroText>
        </div>
        {pessoa.nascimento && (
          <div>
            <MicroText className="block text-text-muted mb-0.5">Nascimento</MicroText>
            <MicroText className="text-text-secondary">{pessoa.nascimento}</MicroText>
          </div>
        )}
        {pessoa.estado_civil && (
          <div>
            <MicroText className="block text-text-muted mb-0.5">Estado Civil</MicroText>
            <MicroText className="text-text-secondary capitalize">{pessoa.estado_civil}</MicroText>
          </div>
        )}
      </div>
      {pessoa.endereco && (
        <div className="pt-1 border-t border-border-subtle">
          <MicroText className="block text-text-muted mb-0.5">Endereço</MicroText>
          <MicroText className="text-text-secondary">
            {pessoa.endereco}{pessoa.bairro ? `, ${pessoa.bairro}` : ""}{pessoa.cidade ? ` — ${pessoa.cidade}` : ""}{pessoa.estado ? `/${pessoa.estado}` : ""}{pessoa.cep ? ` (${pessoa.cep})` : ""}
          </MicroText>
        </div>
      )}
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
        {/* Cabeçalho + Ações */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1 min-w-0">
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
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {/* Score */}
            {latestAudit && reserva.status !== "pending" && (
              <div className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 ${
                latestAudit.score === 100
                  ? "border-status-success/20 bg-status-success/5"
                  : "border-status-error/20 bg-status-error/5"
              }`}>
                <MicroText className="text-text-muted">Score</MicroText>
                <span className={`text-[13px] font-medium tabular-nums ${
                  latestAudit.score === 100
                    ? "text-status-success"
                    : "text-status-error"
                }`}>
                  {latestAudit.score ?? 0}/100
                </span>
              </div>
            )}
            {/* Ações */}
            {(reserva.status === "approved" || reserva.status === "divergent") && (
              <>
                <ConfirmReservationButton
                  reservationId={reserva.id}
                  isOverride={reserva.status === "divergent"}
                />
                <ReprocessReservationButton reservationId={reserva.id} />
              </>
            )}
          </div>
        </div>

        {/* Etapas CVCRM */}
        <CvcrmStageStepper situacao={situacaoCv} status={reserva.status} />

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

                  return (
                    <div key={grupo}>
                      <TextLabel className="uppercase tracking-wide text-[11px] text-text-muted block mb-2">
                        {grupo}
                      </TextLabel>
                      <div className="space-y-0.5">
                        {docs.map((doc, i) => {
                          const docAgent = doc?.tipo ? docTypeToAgent(doc.tipo) : null;
                          const docExtraction = docAgent ? extractionMap[docAgent] : undefined;

                          return (
                            <DocumentoRow
                              key={doc?.idreservasdocumentos ?? `${grupo}-${i}`}
                              doc={doc}
                              agentName={docAgent}
                              extraction={docExtraction}
                            />
                          );
                        })}
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
                  pessoa={snapshot.pessoas.titular}
                />
                {snapshot.pessoas.associados && Object.entries(snapshot.pessoas.associados).map(([tipo, pessoa]) => (
                  <PessoaCard
                    key={tipo}
                    titulo={tipo}
                    pessoa={pessoa}
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
