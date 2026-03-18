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

type CompletenessResult = {
  complete: boolean;
  missingGroups: string[];
  message: string;
  documentTypes: string[];
};

export function checkDocumentCompleteness(
  documentos: Record<string, DocumentItem[]>
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
