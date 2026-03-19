const REQUIRED_DOCUMENT_GROUPS = [
  ["Carteira nacional de habilitação (CNH)", "RG Principal", "CPF Principal"],
  ["Declaração de Residência", "Comprovante de Residëncia"],
  ["Ato"],
  ["Termo de ciência"],
  ["Fluxo"],
  ["Carteira de Trabalho", "Cartão de Crédito", "Comprovante de Renda", "Comprovante de Renda (Holerite)"],
  ["Certidão de Nascimento", "Certidão de Estado Civil"],
  ["Quadro Resumo"],
  ["Planta"],
] as const;

const ACCEPTED_STATUSES = ["Aprovado", "Aguardando aprovação"];

type DocumentItem = {
  tipo: string;
  situacao: string;
  link?: string;
  nome?: string;
  [key: string]: unknown;
};

type ContratoItem = {
  contrato: string;
  link?: string;
  [key: string]: unknown;
};

type CompletenessResult = {
  complete: boolean;
  missingGroups: string[];
  message: string;
  documentTypes: string[];
};

function mapContractNameToGroups(name: string): string[] {
  const lower = name.toLowerCase();
  const mapped: string[] = [];

  if (lower.includes("quadro resumo")) mapped.push("Quadro Resumo");
  if (lower.includes("fluxo") || lower.includes("planilha")) mapped.push("Fluxo");
  if (lower.includes("memorial") || lower.includes("planta")) mapped.push("Planta");
  if (lower.includes("termo")) mapped.push("Termo de ciência");
  if (
    lower.includes("instrumento") ||
    lower.includes("promessa de compra") ||
    lower.includes("contrato de venda")
  ) {
    mapped.push("Ato");
  }

  return mapped;
}

export function checkDocumentCompleteness(
  documentos: Record<string, DocumentItem[]>,
  contratos?: ContratoItem[],
): CompletenessResult {
  const allDocTypes: string[] = [];

  for (const docs of Object.values(documentos)) {
    if (!Array.isArray(docs)) continue;
    for (const doc of docs) {
      if (ACCEPTED_STATUSES.includes(doc.situacao)) {
        allDocTypes.push(doc.tipo);
      }
    }
  }

  if (contratos && Array.isArray(contratos)) {
    for (const contrato of contratos) {
      const mapped = mapContractNameToGroups(contrato.contrato);
      allDocTypes.push(...mapped);
    }
  }

  const missingGroups: string[] = [];

  for (const group of REQUIRED_DOCUMENT_GROUPS) {
    const found = group.some((docType) => allDocTypes.includes(docType));
    if (!found) {
      missingGroups.push(group.join(" OU "));
    }
  }

  const complete = missingGroups.length === 0;
  const message = complete
    ? "Todos os requisitos obrigatórios foram atendidos."
    : `Documentos ainda não validados por I.A.\n\nFaltam os seguintes documentos para prosseguir com a validação: ${missingGroups.join("; ")}.`;

  return {
    complete,
    missingGroups,
    message,
    documentTypes: allDocTypes,
  };
}
