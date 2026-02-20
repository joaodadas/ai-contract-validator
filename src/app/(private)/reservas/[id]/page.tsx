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
import { FileText, Users, Brain, Building2, ExternalLink } from "lucide-react";
import { getReservationByExternalId } from "@/db/queries";
import { JsonViewer } from "./json-viewer";
import type { ReservaProcessada, CvcrmDocumentoItem } from "@/lib/cvcrm/types";

const statusMap = {
  pending:   { variant: "pending" as const,  label: "Pendente IA" },
  approved:  { variant: "success" as const,  label: "Aprovado" },
  divergent: { variant: "error" as const,    label: "Divergente" },
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

function DocumentoRow({ doc }: { doc: CvcrmDocumentoItem }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md px-3 py-2.5 hover:bg-surface-base/50 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <FileText className="h-4 w-4 shrink-0 text-text-muted" strokeWidth={1.5} />
        <div className="min-w-0">
          <Text className="truncate text-text-primary text-[13px] leading-snug">{doc.nome}</Text>
          <MicroText className="text-text-muted">{doc.tipo}</MicroText>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <DocSituacaoBadge situacao={doc.situacao} />
        {doc.link && (
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

  const { variant, label } = statusMap[reserva.status];
  const snapshot = reserva.cvcrmSnapshot as ReservaProcessada | null;

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
              <StatusBadge variant={variant}>{label}</StatusBadge>
            </div>
            <div className="flex items-center gap-3">
              <Text className="text-text-secondary">{reserva.enterprise}</Text>
              {snapshot?.planta && (
                <>
                  <span className="text-text-muted">·</span>
                  <Text className="text-text-muted">
                    {snapshot.planta.numero} — {snapshot.planta.bloco} — Andar {snapshot.planta.andar}
                  </Text>
                </>
              )}
              <span className="text-text-muted">·</span>
              <MicroText>{formatDate(reserva.createdAt)}</MicroText>
            </div>
            {snapshot?.situacao && (
              <div className="flex items-center gap-2 pt-0.5">
                <MicroText className="text-text-muted">Situação CVCRM:</MicroText>
                <MicroText className="text-text-secondary font-medium">{snapshot.situacao}</MicroText>
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
                {Object.entries(snapshot.documentos).map(([grupo, docs]) => (
                  <div key={grupo}>
                    <TextLabel className="uppercase tracking-wide text-[11px] text-text-muted block mb-2">
                      {grupo}
                    </TextLabel>
                    <div className="space-y-0.5">
                      {docs.map((doc) => (
                        <DocumentoRow key={doc.idreservasdocumentos} doc={doc} />
                      ))}
                    </div>
                  </div>
                ))}
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
            {snapshot?.contratos && snapshot.contratos.length > 0 ? (
              <div className="space-y-0.5">
                {snapshot.contratos.map((contrato) => (
                  <div
                    key={contrato.idcontrato}
                    className="flex items-center justify-between rounded-md px-3 py-2.5 hover:bg-surface-base/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-4 w-4 shrink-0 text-text-muted" strokeWidth={1.5} />
                      <Text className="truncate text-text-primary text-[13px] leading-snug">
                        {contrato.contrato}
                      </Text>
                    </div>
                    <MicroText className="shrink-0 text-text-muted">{contrato.data}</MicroText>
                  </div>
                ))}
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
            {snapshot?.pessoas ? (
              <div className="space-y-3">
                <PessoaCard
                  titulo="Titular"
                  nome={snapshot.pessoas.titular.nome}
                  documento={snapshot.pessoas.titular.documento}
                  email={snapshot.pessoas.titular.email}
                  telefone={snapshot.pessoas.titular.telefone}
                />
                {Object.entries(snapshot.pessoas.associados).map(([tipo, pessoa]) => (
                  <PessoaCard
                    key={tipo}
                    titulo={tipo}
                    nome={pessoa.nome}
                    documento={pessoa.documento}
                    email={pessoa.email}
                    telefone={pessoa.telefone}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-md bg-surface-base/60 px-4 py-6 text-center">
                <MutedText>Nenhuma pessoa disponível</MutedText>
              </div>
            )}
          </SectionBlock>

          <Separator className="bg-border-subtle" />

          {/* Logs da IA */}
          <SectionBlock
            title="Logs da IA"
            icon={<Brain className="h-4 w-4" strokeWidth={1.75} />}
            defaultOpen={false}
          >
            <div className="rounded-md bg-surface-base/60 px-4 py-6 text-center">
              <MutedText>Nenhum log disponível ainda</MutedText>
            </div>
          </SectionBlock>
        </SurfaceCard>

        {/* Payload bruto do snapshot */}
        {snapshot && <JsonViewer data={snapshot} />}
      </PageContainer>
    </>
  );
}
