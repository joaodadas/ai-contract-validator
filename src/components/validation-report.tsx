"use client";

import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  Building2,
  DollarSign,
  FileSignature,
  Users,
  FileCheck,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";

type StatusValue = "Igual" | "Divergente" | "Ignorado";

type StatusField = {
  status: StatusValue;
  detalhes: string;
};

type PessoaField = {
  papel: string;
  status: StatusValue;
  detalhes: string;
};

type ValidationData = {
  dados_imovel?: {
    nome_empreendimento?: StatusField;
    unidade_bloco?: StatusField;
  };
  financeiro?: {
    valor_venda_total?: StatusField;
    financiamento?: StatusField;
    subsidio?: StatusField;
    parcelas_mensais?: StatusField;
    chaves?: StatusField;
    pos_chaves?: StatusField;
  };
  Termo?: StatusField;
  pessoas?: PessoaField[];
  validacao_endereco?: StatusField;
  Documentos?: StatusField;
};

function StatusIcon({ status }: { status: StatusValue }) {
  switch (status) {
    case "Igual":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" strokeWidth={2} />;
    case "Divergente":
      return <XCircle className="h-4 w-4 text-red-500" strokeWidth={2} />;
    case "Ignorado":
      return <MinusCircle className="h-4 w-4 text-zinc-400" strokeWidth={2} />;
  }
}

function StatusPill({ status }: { status: StatusValue }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
        status === "Igual" && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
        status === "Divergente" && "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400",
        status === "Ignorado" && "bg-zinc-100 text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400"
      )}
    >
      <StatusIcon status={status} />
      {status}
    </span>
  );
}

const FIELD_LABELS: Record<string, string> = {
  nome_empreendimento: "Nome do Empreendimento",
  unidade_bloco: "Unidade / Bloco",
  valor_venda_total: "Valor Total de Venda",
  financiamento: "Financiamento",
  subsidio: "Subsídio",
  parcelas_mensais: "Parcelas Mensais",
  chaves: "Chaves",
  pos_chaves: "Pós-Chaves",
  validacao_endereco: "Endereço",
};

function ValidationRow({ label, field }: { label: string; field: StatusField }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 px-3 rounded-lg hover:bg-surface-base/40 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-text-primary leading-snug">
          {label}
        </p>
        {field.detalhes && (
          <p className="text-[12px] text-red-600 dark:text-red-400 mt-0.5 leading-relaxed">
            {field.detalhes}
          </p>
        )}
      </div>
      <StatusPill status={field.status} />
    </div>
  );
}

function ValidationSection({
  title,
  icon,
  fields,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ReactNode;
  fields: { label: string; field: StatusField }[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const divergentCount = fields.filter((f) => f.field.status === "Divergente").length;
  const allEqual = fields.every((f) => f.field.status === "Igual" || f.field.status === "Ignorado");

  return (
    <div className="overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 py-3 px-3 rounded-lg hover:bg-surface-base/40 transition-colors"
      >
        <span className={cn("transition-colors", allEqual ? "text-emerald-500" : "text-red-500")}>
          {icon}
        </span>
        <span className="flex-1 text-left text-[14px] font-semibold text-text-primary tracking-tight">
          {title}
        </span>
        {divergentCount > 0 && (
          <span className="inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 text-[11px] font-semibold px-1.5">
            {divergentCount}
          </span>
        )}
        <ChevronDown
          className={cn(
            "h-4 w-4 text-text-muted transition-transform duration-200",
            !open && "-rotate-90"
          )}
          strokeWidth={1.75}
        />
      </button>
      {open && (
        <div className="pl-2 pb-2 space-y-0.5 animate-in fade-in-0 slide-in-from-top-1 duration-150">
          {fields.map(({ label, field }) => (
            <ValidationRow key={label} label={label} field={field} />
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryBar({ validation }: { validation: ValidationData }) {
  let total = 0;
  let igual = 0;
  let divergente = 0;
  let ignorado = 0;

  function countFields(obj: Record<string, unknown>) {
    for (const val of Object.values(obj)) {
      if (Array.isArray(val)) {
        for (const item of val) {
          if (item && typeof item === "object" && "status" in item) {
            const f = item as StatusField;
            total++;
            if (f.status === "Igual") igual++;
            else if (f.status === "Divergente") divergente++;
            else if (f.status === "Ignorado") ignorado++;
          }
        }
        continue;
      }
      if (val && typeof val === "object" && "status" in val) {
        const f = val as StatusField;
        total++;
        if (f.status === "Igual") igual++;
        else if (f.status === "Divergente") divergente++;
        else if (f.status === "Ignorado") ignorado++;
      } else if (val && typeof val === "object") {
        countFields(val as Record<string, unknown>);
      }
    }
  }

  countFields(validation as unknown as Record<string, unknown>);

  const igualPct = total > 0 ? (igual / total) * 100 : 0;
  const divergentePct = total > 0 ? (divergente / total) * 100 : 0;
  const ignoradoPct = total > 0 ? (ignorado / total) * 100 : 0;

  return (
    <div className="space-y-3">
      <div className="flex h-2 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
        {igualPct > 0 && (
          <div
            className="bg-emerald-500 transition-all duration-500"
            style={{ width: `${igualPct}%` }}
          />
        )}
        {divergentePct > 0 && (
          <div
            className="bg-red-500 transition-all duration-500"
            style={{ width: `${divergentePct}%` }}
          />
        )}
        {ignoradoPct > 0 && (
          <div
            className="bg-zinc-300 dark:bg-zinc-600 transition-all duration-500"
            style={{ width: `${ignoradoPct}%` }}
          />
        )}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-[11px] text-text-muted">
            {igual} Igual
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          <span className="text-[11px] text-text-muted">
            {divergente} Divergente
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-600" />
          <span className="text-[11px] text-text-muted">
            {ignorado} Ignorado
          </span>
        </div>
      </div>
    </div>
  );
}

function resolveFields(section: Record<string, unknown> | undefined): { label: string; field: StatusField }[] {
  if (!section) return [];
  return Object.entries(section)
    .filter(([, val]) => val && typeof val === "object" && "status" in (val as Record<string, unknown>))
    .map(([key, val]) => ({
      label: FIELD_LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      field: val as StatusField,
    }));
}

const PAPEL_LABELS: Record<string, string> = {
  titular: "Titular",
  conjuge: "Cônjuge",
  comprador: "Comprador",
  fiador: "Fiador",
};

function resolvePessoasFields(pessoas: PessoaField[] | undefined): { label: string; field: StatusField }[] {
  if (!pessoas || !Array.isArray(pessoas)) return [];
  return pessoas.map((p) => ({
    label: PAPEL_LABELS[p.papel] ?? p.papel.replace(/\b\w/g, (c) => c.toUpperCase()),
    field: { status: p.status, detalhes: p.detalhes },
  }));
}

interface ValidationReportProps {
  validation: ValidationData;
  formattedReport?: string;
  className?: string;
}

export function ValidationReport({
  validation,
  className,
}: ValidationReportProps) {
  const imovelFields = resolveFields(validation.dados_imovel as Record<string, unknown>);
  const financeiroFields = resolveFields(validation.financeiro as Record<string, unknown>);
  const pessoasFields = resolvePessoasFields(validation.pessoas);
  const enderecoField = validation.validacao_endereco;

  const termoField = validation.Termo;
  const documentosField = validation.Documentos;

  const hasDivergences = JSON.stringify(validation).includes('"Divergente"');

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            hasDivergences ? "bg-red-50 dark:bg-red-950/30" : "bg-emerald-50 dark:bg-emerald-950/30"
          )}
        >
          {hasDivergences ? (
            <XCircle className="h-4 w-4 text-red-500" strokeWidth={2} />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" strokeWidth={2} />
          )}
        </div>
        <div>
          <p className="text-[14px] font-semibold text-text-primary tracking-tight">
            {hasDivergences ? "Divergências Encontradas" : "Validação Aprovada"}
          </p>
          <p className="text-[12px] text-text-muted">
            {hasDivergences
              ? "Revise os itens abaixo antes de aprovar"
              : "Todos os critérios validados com sucesso"}
          </p>
        </div>
      </div>

      <SummaryBar validation={validation} />

      <div className="space-y-1 rounded-xl bg-surface-subtle p-2" style={{
        boxShadow: "0px 0px 0px 1px rgba(0,0,0,0.04), 0px 1px 1px 0px rgba(0,0,0,0.03)"
      }}>
        {imovelFields.length > 0 && (
          <ValidationSection
            title="Imóvel"
            icon={<Building2 className="h-4 w-4" strokeWidth={1.75} />}
            fields={imovelFields}
          />
        )}

        {financeiroFields.length > 0 && (
          <ValidationSection
            title="Financeiro"
            icon={<DollarSign className="h-4 w-4" strokeWidth={1.75} />}
            fields={financeiroFields}
          />
        )}

        {termoField && (
          <ValidationSection
            title="Termo de Ciência"
            icon={<FileSignature className="h-4 w-4" strokeWidth={1.75} />}
            fields={[{ label: "Assinatura", field: termoField }]}
          />
        )}

        {pessoasFields.length > 0 && (
          <ValidationSection
            title="Pessoas"
            icon={<Users className="h-4 w-4" strokeWidth={1.75} />}
            fields={pessoasFields}
          />
        )}

        {enderecoField && (
          <ValidationSection
            title="Endereço"
            icon={<Building2 className="h-4 w-4" strokeWidth={1.75} />}
            fields={[{ label: "Validação de Endereço", field: enderecoField }]}
          />
        )}

        {documentosField && (
          <ValidationSection
            title="Documentos"
            icon={<FileCheck className="h-4 w-4" strokeWidth={1.75} />}
            fields={[{ label: "Checklist de Documentos", field: documentosField }]}
          />
        )}
      </div>
    </div>
  );
}
