"use client";

import { useState } from "react";
import { ChevronDown, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

const AGENT_LABELS: Record<string, string> = {
  "cnh-agent": "CNH",
  "rgcpf-agent": "RG/CPF",
  "ato-agent": "Comprovante de Pagamento",
  "quadro-resumo-agent": "Quadro Resumo",
  "fluxo-agent": "Fluxo Financeiro",
  "planta-agent": "Planta",
  "comprovante-residencia-agent": "Comprovante de Residência",
  "declaracao-residencia-agent": "Declaração de Residência",
  "certidao-estado-civil-agent": "Certidão de Estado Civil",
  "termo-agent": "Termo de Ciência",
  "carteira-trabalho-agent": "Carteira de Trabalho",
  "comprovante-renda-agent": "Comprovante de Renda",
  "carta-fiador-agent": "Carta Fiador",
};

/**
 * Friendly Portuguese labels for extracted fields, organized by agent.
 * Falls back to auto-formatting if not mapped.
 */
const FIELD_LABELS: Record<string, string> = {
  // Identity
  nome: "Nome",
  cpf: "CPF",
  rg: "RG",
  rg_ou_identidade: "RG / Identidade",
  data_nascimento: "Data de Nascimento",
  nacionalidade: "Nacionalidade",
  estado_civil: "Estado Civil",
  filiacao1: "Filiação (Mãe)",
  filiacao2: "Filiação (Pai)",
  nome_conjuge: "Nome do Cônjuge",
  alteracao_de_nome: "Alteração de Nome",
  nome_anterior: "Nome Anterior",
  nome_atual: "Nome Atual",
  tipo: "Tipo",

  // Address
  nome_titular: "Nome do Titular",
  logradouro: "Logradouro",
  numero: "Número",
  complemento: "Complemento",
  bairro: "Bairro",
  cidade: "Cidade",
  estado: "Estado",
  cep: "CEP",
  nome_morador_declarado: "Nome do Morador Declarado",

  // Employment & Income
  ocupacao: "Ocupação",
  empresa: "Empresa",
  data_admissao: "Data de Admissão",
  renda: "Renda",
  com_foto: "Possui Foto",
  valor_renda: "Valor da Renda",
  data_referencia: "Data de Referência",

  // Financial
  valor_total: "Valor Total",
  valor_venda_total: "Valor Total de Venda",
  sinal_ato: "Sinal / Ato",
  financiamento_bancario: "Financiamento Bancário",
  subsidio: "Subsídio (FGTS/MCMV)",
  subsidio_total: "Subsídio Total",
  subsidio_outros: "Outros Subsídios",
  score: "Score de Crédito",
  cpf_titular: "CPF do Titular",

  // Installments
  parcelas_mensais: "Parcelas Mensais",
  reforcos_anuais: "Reforços Anuais",
  chaves: "Chaves (Entrega)",
  pos_chaves: "Pós-Chaves",
  nome_grupo: "Grupo",
  qtd_parcelas: "Qtd. Parcelas",
  valor_parcela: "Valor da Parcela",
  valor_total_grupo: "Valor Total do Grupo",
  data_inicio: "Data Início",
  data_fim: "Data Fim",
  descricao: "Descrição",
  valor: "Valor",
  data_vencimento: "Data de Vencimento",
  vencimento: "Vencimento",

  // Property
  empreendimento: "Empreendimento",
  unidade: "Unidade",
  bloco: "Bloco",
  apto: "Apartamento",
  quartos: "Quartos",
  banheiros: "Banheiros",
  vagas: "Vagas",
  area_privativa_m2: "Área Privativa (m²)",
  data_entrega_imovel: "Data de Entrega do Imóvel",

  // Signature
  assinado: "Assinado",
  assinada: "Assinada",
  nome_assinante: "Nome do Assinante",
  data_assinatura: "Data da Assinatura",

  // Guarantor
  nome_fiador: "Nome do Fiador",
  cpf_fiador: "CPF do Fiador",

  // Nested groups
  imovel: "Imóvel",
  compradores: "Compradores",
  financeiro: "Financeiro",
  dados_cadastrais: "Dados Cadastrais",
  output: "",
};

function getFieldLabel(key: string): string {
  if (FIELD_LABELS[key] !== undefined) return FIELD_LABELS[key];
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "number") {
    if (value === 0) return "—";
    // Format as currency if it looks like money (> 100)
    if (value >= 100 && Number.isFinite(value)) {
      return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }
    return value.toLocaleString("pt-BR");
  }
  if (typeof value === "string") {
    if (value === "") return "—";
    // Format CPF
    const digits = value.replace(/\D/g, "");
    if (digits.length === 11 && /^\d{11}$/.test(digits)) {
      return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    }
    // Format date YYYY-MM-DD → DD/MM/YYYY
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split("-");
      return `${d}/${m}/${y}`;
    }
    return value;
  }
  return String(value);
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 px-3">
      <span className="text-[13px] text-text-muted shrink-0">{label}</span>
      <span className="text-[13px] text-text-primary font-medium text-right">{value}</span>
    </div>
  );
}

function renderFields(data: Record<string, unknown>, depth = 0): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (key === "schema_version" || key === "confianca" || key === "document_type") continue;
    if (value === null || value === undefined || value === "") continue;

    const label = getFieldLabel(key);

    // Skip the "output" wrapper — render its children directly
    if (key === "output" && typeof value === "object" && !Array.isArray(value)) {
      nodes.push(...renderFields(value as Record<string, unknown>, depth));
      continue;
    }

    // Nested object (e.g., imovel, financeiro, dados_cadastrais)
    if (typeof value === "object" && !Array.isArray(value)) {
      const children = renderFields(value as Record<string, unknown>, depth + 1);
      if (children.length === 0) continue;

      nodes.push(
        <div key={key} className={depth > 0 ? "mt-2" : "mt-3"}>
          <div className="px-3 pb-1">
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
              {label}
            </span>
          </div>
          <div className="rounded-lg bg-surface-base/40 divide-y divide-border-subtle">
            {children}
          </div>
        </div>,
      );
      continue;
    }

    // Array of objects (e.g., parcelas_mensais, compradores)
    if (Array.isArray(value)) {
      if (value.length === 0) continue;

      if (typeof value[0] === "object") {
        nodes.push(
          <div key={key} className={depth > 0 ? "mt-2" : "mt-3"}>
            <div className="px-3 pb-1">
              <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                {label} ({value.length})
              </span>
            </div>
            <div className="space-y-2">
              {value.map((item, i) => (
                <div key={i} className="rounded-lg bg-surface-base/40 divide-y divide-border-subtle">
                  {renderFields(item as Record<string, unknown>, depth + 1)}
                </div>
              ))}
            </div>
          </div>,
        );
        continue;
      }

      // Array of primitives
      nodes.push(
        <DataRow key={key} label={label} value={value.map(formatValue).join(", ")} />,
      );
      continue;
    }

    // Primitive value
    nodes.push(
      <DataRow key={key} label={label} value={formatValue(value)} />,
    );
  }

  return nodes;
}

type ExtractionDetailProps = {
  agentName: string;
  data: Record<string, unknown> | null;
  ok: boolean;
  children: React.ReactNode;
};

export function ExtractionDetail({ agentName, data, ok, children }: ExtractionDetailProps) {
  const [open, setOpen] = useState(false);
  const label = AGENT_LABELS[agentName] ?? agentName;

  const extractedData =
    data && typeof data === "object" && "output" in data
      ? (data as { output: Record<string, unknown> }).output
      : data;

  const hasData =
    extractedData &&
    typeof extractedData === "object" &&
    Object.keys(extractedData).length > 0;

  // Count non-empty fields for summary
  const fieldCount = hasData
    ? Object.values(extractedData as Record<string, unknown>).filter(
        (v) => v !== null && v !== undefined && v !== "" && v !== 0,
      ).length
    : 0;

  return (
    <div>
      <div
        className="flex items-center gap-1 cursor-pointer group"
        onClick={() => setOpen(!open)}
      >
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-text-muted transition-transform duration-150 ${open ? "" : "-rotate-90"}`}
          strokeWidth={2}
        />
        <div className="flex-1 min-w-0">{children}</div>
      </div>

      {open && (
        <div className="ml-7 mt-1.5 mb-3 animate-in fade-in-0 slide-in-from-top-1 duration-150">
          <div className="rounded-xl border border-border-subtle bg-surface-elevated overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-surface-subtle border-b border-border-subtle">
              <span className="text-[13px] font-semibold text-text-primary">
                Dados Extraídos — {label}
              </span>
              {ok ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
                  {fieldCount > 0 ? `${fieldCount} dados encontrados` : "Processado"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-red-500">
                  <XCircle className="h-3.5 w-3.5" strokeWidth={2} />
                  Falha na extração
                </span>
              )}
            </div>

            {/* Content */}
            <div className="px-1 py-1">
              {hasData ? (
                <div className="divide-y divide-border-subtle">
                  {renderFields(extractedData as Record<string, unknown>)}
                </div>
              ) : !ok ? (
                <div className="flex items-center gap-2 px-3 py-4 text-[13px] text-red-500">
                  <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  Não foi possível extrair dados deste documento.
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-4 text-[13px] text-text-muted">
                  <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  Nenhum dado encontrado neste documento.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
