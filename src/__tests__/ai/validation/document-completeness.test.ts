import { checkDocumentCompleteness } from "@/ai/validation/document-completeness";

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

/**
 * Helper: builds a documentos record with one approved doc per required group.
 * Groups covered by documents (not contracts):
 *   1. RG Principal
 *   2. Comprovante de Residência
 *   3. Ato
 *   4. Termo de ciência
 *   5. Fluxo
 *   6. Comprovante de Renda
 *   7. Certidão de Estado Civil
 *   8. Quadro Resumo
 *   9. Planta
 */
function makeFullDocumentos(
  overrides: Partial<Record<string, DocumentItem[]>> = {},
  situacao = "Aguardando aprovação",
): Record<string, DocumentItem[]> {
  const base: Record<string, DocumentItem[]> = {
    identidade: [{ tipo: "RG Principal", situacao }],
    endereco: [{ tipo: "Comprovante de Residência", situacao }],
    ato: [{ tipo: "Ato", situacao }],
    termo: [{ tipo: "Termo de ciência", situacao }],
    fluxo: [{ tipo: "Fluxo", situacao }],
    renda: [{ tipo: "Comprovante de Renda", situacao }],
    civil: [{ tipo: "Certidão de Estado Civil", situacao }],
    quadro: [{ tipo: "Quadro Resumo", situacao }],
    planta: [{ tipo: "Planta", situacao }],
  };
  return { ...base, ...overrides };
}

describe("checkDocumentCompleteness", () => {
  describe("all groups present", () => {
    it("returns complete=true when every group has at least one approved doc", () => {
      const documentos = makeFullDocumentos();
      const result = checkDocumentCompleteness(documentos);

      expect(result.complete).toBe(true);
      expect(result.missingGroups).toEqual([]);
      expect(result.message).toBe(
        "Todos os requisitos obrigatórios foram atendidos.",
      );
    });

    it("accepts docs with situacao 'Aprovado'", () => {
      const documentos = makeFullDocumentos({}, "Aprovado");
      const result = checkDocumentCompleteness(documentos);

      expect(result.complete).toBe(true);
      expect(result.missingGroups).toEqual([]);
    });
  });

  describe("missing one group (Planta)", () => {
    it("returns complete=false and lists the missing group", () => {
      const documentos = makeFullDocumentos();
      delete documentos.planta;

      const result = checkDocumentCompleteness(documentos);

      expect(result.complete).toBe(false);
      expect(result.missingGroups).toContain("Planta");
      expect(result.message).toContain("Planta");
    });
  });

  describe("OR logic within group", () => {
    it("satisfies identity group with only RG Principal (no CNH or CPF)", () => {
      const documentos = makeFullDocumentos({
        identidade: [
          { tipo: "RG Principal", situacao: "Aguardando aprovação" },
        ],
      });

      const result = checkDocumentCompleteness(documentos);

      expect(result.complete).toBe(true);
      expect(result.missingGroups).toEqual([]);
    });

    it("satisfies identity group with only CNH (no RG or CPF)", () => {
      const documentos = makeFullDocumentos({
        identidade: [
          {
            tipo: "Carteira nacional de habilitação (CNH)",
            situacao: "Aguardando aprovação",
          },
        ],
      });

      const result = checkDocumentCompleteness(documentos);

      expect(result.complete).toBe(true);
      expect(result.missingGroups).toEqual([]);
    });

    it("satisfies residence group with trema variant (Comprovante de Residëncia)", () => {
      const documentos = makeFullDocumentos({
        endereco: [
          {
            tipo: "Comprovante de Residëncia",
            situacao: "Aguardando aprovação",
          },
        ],
      });

      const result = checkDocumentCompleteness(documentos);

      expect(result.complete).toBe(true);
      expect(result.missingGroups).toEqual([]);
    });

    it("satisfies residence group with Declaração de Residência alone", () => {
      const documentos = makeFullDocumentos({
        endereco: [
          {
            tipo: "Declaração de Residência",
            situacao: "Aprovado",
          },
        ],
      });

      const result = checkDocumentCompleteness(documentos);

      expect(result.complete).toBe(true);
    });
  });

  describe("status filtering", () => {
    it("does NOT count docs with situacao 'Reprovado'", () => {
      const documentos = makeFullDocumentos();
      documentos.identidade = [
        { tipo: "RG Principal", situacao: "Reprovado" },
      ];

      const result = checkDocumentCompleteness(documentos);

      expect(result.complete).toBe(false);
      expect(result.missingGroups).toContain(
        "Carteira nacional de habilitação (CNH) OU RG Principal OU CPF Principal",
      );
      expect(result.documentTypes).not.toContain("RG Principal");
    });

    it("does NOT count docs with situacao 'Pendente'", () => {
      const documentos = makeFullDocumentos();
      documentos.renda = [
        { tipo: "Comprovante de Renda", situacao: "Pendente" },
      ];

      const result = checkDocumentCompleteness(documentos);

      expect(result.complete).toBe(false);
    });

    it("counts only accepted statuses among mixed docs", () => {
      const documentos = makeFullDocumentos();
      documentos.identidade = [
        { tipo: "RG Principal", situacao: "Reprovado" },
        { tipo: "CPF Principal", situacao: "Aprovado" },
      ];

      const result = checkDocumentCompleteness(documentos);

      expect(result.complete).toBe(true);
      expect(result.documentTypes).toContain("CPF Principal");
      expect(result.documentTypes).not.toContain("RG Principal");
    });
  });

  describe("contract name mapping", () => {
    it('maps contract "Quadro Resumo v.2.0" to Quadro Resumo group', () => {
      const documentos = makeFullDocumentos();
      delete documentos.quadro;

      const contratos: ContratoItem[] = [
        { contrato: "Quadro Resumo v.2.0" },
      ];

      const result = checkDocumentCompleteness(documentos, contratos);

      expect(result.complete).toBe(true);
      expect(result.missingGroups).toEqual([]);
      expect(result.documentTypes).toContain("Quadro Resumo");
    });

    it("maps contract with 'planta' in name to Planta group", () => {
      const documentos = makeFullDocumentos();
      delete documentos.planta;

      const contratos: ContratoItem[] = [
        { contrato: "Memorial Descritivo - Planta" },
      ];

      const result = checkDocumentCompleteness(documentos, contratos);

      expect(result.complete).toBe(true);
      expect(result.documentTypes).toContain("Planta");
    });

    it("maps contract with 'fluxo' in name to Fluxo group", () => {
      const documentos = makeFullDocumentos();
      delete documentos.fluxo;

      const contratos: ContratoItem[] = [
        { contrato: "Fluxo Financeiro 2024" },
      ];

      const result = checkDocumentCompleteness(documentos, contratos);

      expect(result.complete).toBe(true);
      expect(result.documentTypes).toContain("Fluxo");
    });

    it("maps contract with 'planilha' in name to Fluxo group", () => {
      const documentos = makeFullDocumentos();
      delete documentos.fluxo;

      const contratos: ContratoItem[] = [
        { contrato: "Planilha calculo 10858" },
      ];

      const result = checkDocumentCompleteness(documentos, contratos);

      expect(result.complete).toBe(true);
      expect(result.documentTypes).toContain("Fluxo");
    });

    it("maps contract with 'termo' in name to Termo de ciência group", () => {
      const documentos = makeFullDocumentos();
      delete documentos.termo;

      const contratos: ContratoItem[] = [
        { contrato: "Termo de Ciência e Aceite" },
      ];

      const result = checkDocumentCompleteness(documentos, contratos);

      expect(result.complete).toBe(true);
      expect(result.documentTypes).toContain("Termo de ciência");
    });
  });

  describe("contract maps multiple groups", () => {
    it('maps "Instrumento Particular de Promessa de Compra e Venda" to Ato', () => {
      const documentos = makeFullDocumentos();
      delete documentos.ato;

      const contratos: ContratoItem[] = [
        {
          contrato:
            "Instrumento Particular de Promessa de Compra e Venda",
        },
      ];

      const result = checkDocumentCompleteness(documentos, contratos);

      expect(result.complete).toBe(true);
      expect(result.documentTypes).toContain("Ato");
    });

    it("a single contract can satisfy multiple groups at once", () => {
      const documentos = makeFullDocumentos();
      delete documentos.ato;
      delete documentos.termo;

      // This contract name contains both "instrumento" and "termo"
      const contratos: ContratoItem[] = [
        {
          contrato: "Instrumento - Termo Complementar",
        },
      ];

      const result = checkDocumentCompleteness(documentos, contratos);

      expect(result.complete).toBe(true);
      expect(result.documentTypes).toContain("Ato");
      expect(result.documentTypes).toContain("Termo de ciência");
    });
  });

  describe("empty documentos", () => {
    it("returns complete=false with all 9 groups missing when no docs and no contracts", () => {
      const result = checkDocumentCompleteness({});

      expect(result.complete).toBe(false);
      expect(result.missingGroups).toHaveLength(9);
      expect(result.documentTypes).toEqual([]);
    });

    it("lists all required group names in missingGroups", () => {
      const result = checkDocumentCompleteness({});

      expect(result.missingGroups).toContain(
        "Carteira nacional de habilitação (CNH) OU RG Principal OU CPF Principal",
      );
      expect(result.missingGroups).toContain(
        "Declaração de Residência OU Comprovante de Residência OU Comprovante de Residëncia",
      );
      expect(result.missingGroups).toContain("Ato");
      expect(result.missingGroups).toContain("Termo de ciência");
      expect(result.missingGroups).toContain("Fluxo");
      expect(result.missingGroups).toContain(
        "Carteira de Trabalho OU Cartão de Crédito OU Comprovante de Renda OU Comprovante de Renda (Holerite)",
      );
      expect(result.missingGroups).toContain(
        "Certidão de Nascimento OU Certidão de Estado Civil",
      );
      expect(result.missingGroups).toContain("Quadro Resumo");
      expect(result.missingGroups).toContain("Planta");
    });

    it("message describes the missing documents", () => {
      const result = checkDocumentCompleteness({});

      expect(result.message).toContain("Faltam os seguintes documentos");
      expect(result.message).toContain("Planta");
      expect(result.message).toContain("Quadro Resumo");
    });
  });

  describe("multiple missing groups", () => {
    it("lists exactly the 3 missing groups when 3 are absent", () => {
      const documentos = makeFullDocumentos();
      delete documentos.planta;
      delete documentos.quadro;
      delete documentos.civil;

      const result = checkDocumentCompleteness(documentos);

      expect(result.complete).toBe(false);
      expect(result.missingGroups).toHaveLength(3);
      expect(result.missingGroups).toContain(
        "Certidão de Nascimento OU Certidão de Estado Civil",
      );
      expect(result.missingGroups).toContain("Quadro Resumo");
      expect(result.missingGroups).toContain("Planta");
    });

    it("message lists all missing groups separated by semicolons", () => {
      const documentos = makeFullDocumentos();
      delete documentos.planta;
      delete documentos.quadro;
      delete documentos.civil;

      const result = checkDocumentCompleteness(documentos);

      // The message joins missing groups with "; "
      const missingPart = result.message.split(": ").pop()!;
      const groups = missingPart.replace(".", "").split("; ");
      expect(groups).toHaveLength(3);
    });
  });
});
