import {
  docTypeToAgent,
  contractNameToAgent,
  isAllowedDocumentType,
  filterDocuments,
} from "@/lib/cvcrm/constants";

describe("docTypeToAgent", () => {
  it.each([
    ["Carteira nacional de habilitação (CNH)", "cnh-agent"],
    ["RG Principal", "rgcpf-agent"],
    ["CPF Principal", "rgcpf-agent"],
    ["Comprovante de Residência", "comprovante-residencia-agent"],
    ["Comprovante de Residëncia", "comprovante-residencia-agent"],
    ["Declaração de Residência", "declaracao-residencia-agent"],
    ["Certidão de Estado Civil", "certidao-estado-civil-agent"],
    ["Carteira de Trabalho", "carteira-trabalho-agent"],
    ["Comprovante de Renda", "comprovante-renda-agent"],
    ["Termo de ciência", "termo-agent"],
    ["Quadro Resumo", "quadro-resumo-agent"],
  ])('maps "%s" to "%s"', (tipo, expected) => {
    expect(docTypeToAgent(tipo)).toBe(expected);
  });

  it('maps "Fluxo" via exact lowercase match', () => {
    expect(docTypeToAgent("Fluxo")).toBe("fluxo-agent");
  });

  it('maps "Ato" via exact lowercase match', () => {
    expect(docTypeToAgent("Ato")).toBe("ato-agent");
  });

  it('maps "Planta" via exact lowercase match', () => {
    expect(docTypeToAgent("Planta")).toBe("planta-agent");
  });

  it("returns null for unknown types", () => {
    expect(docTypeToAgent("Outros")).toBeNull();
    expect(docTypeToAgent("Random document")).toBeNull();
  });

  it("is case insensitive", () => {
    expect(docTypeToAgent("rg principal")).toBe("rgcpf-agent");
  });
});

describe("contractNameToAgent", () => {
  it.each([
    ["Quadro Resumo v.2.0", "quadro-resumo-agent"],
    ["Planta", "planta-agent"],
  ])('maps "%s" to "%s"', (name, expected) => {
    expect(contractNameToAgent(name)).toBe(expected);
  });

  it.each([
    "Planilha calculo 10858",
    "Fluxo - SAM",
    "Memorial Descritivo",
    "Termo de Ciência",
    "Instrumento Particular",
    "Promessa de Compra e Venda",
    "Random contract",
  ])('returns null for "%s" — not extracted by any agent', (name) => {
    expect(contractNameToAgent(name)).toBeNull();
  });
});

describe("isAllowedDocumentType", () => {
  it("returns true for allowed types", () => {
    expect(isAllowedDocumentType("RG Principal")).toBe(true);
    expect(isAllowedDocumentType("Comprovante de Renda")).toBe(true);
  });

  it("is case insensitive", () => {
    expect(isAllowedDocumentType("rg principal")).toBe(true);
  });

  it("returns false for disallowed types", () => {
    expect(isAllowedDocumentType("Outros")).toBe(false);
    expect(isAllowedDocumentType("Pasta completa")).toBe(false);
  });

  it("accepts trema variant from CVCRM: Comprovante de Residëncia", () => {
    expect(isAllowedDocumentType("Comprovante de Residëncia")).toBe(true);
  });
});

describe("filterDocuments", () => {
  it("keeps only allowed document types", () => {
    const input = {
      grupo1: [
        { tipo: "RG Principal", url: "a.pdf" },
        { tipo: "Outros", url: "b.pdf" },
      ],
    };
    const result = filterDocuments(input);
    expect(result).toEqual({
      grupo1: [{ tipo: "RG Principal", url: "a.pdf" }],
    });
  });

  it("removes groups that become empty after filtering", () => {
    const input = {
      grupo1: [{ tipo: "Outros", url: "a.pdf" }],
      grupo2: [{ tipo: "RG Principal", url: "b.pdf" }],
    };
    const result = filterDocuments(input);
    expect(result).toEqual({
      grupo2: [{ tipo: "RG Principal", url: "b.pdf" }],
    });
    expect(result).not.toHaveProperty("grupo1");
  });

  it("handles empty input", () => {
    expect(filterDocuments({})).toEqual({});
  });

  it("keeps documents with trema variant (Comprovante de Residëncia)", () => {
    const input = {
      titular: [
        { tipo: "Comprovante de Residëncia", url: "comp.pdf" },
        { tipo: "Outros", url: "other.pdf" },
      ],
    };
    const result = filterDocuments(input);
    expect(result.titular).toHaveLength(1);
    expect(result.titular[0].tipo).toBe("Comprovante de Residëncia");
  });

  it("excludes documents with situacao Reprovado", () => {
    const input = {
      titular: [
        { tipo: "RG Principal", url: "a.pdf", situacao: "Aprovado" },
        { tipo: "RG Principal", url: "b.pdf", situacao: "Reprovado" },
      ],
    };
    const result = filterDocuments(input);
    expect(result.titular).toHaveLength(1);
    expect(result.titular[0].url).toBe("a.pdf");
  });

  it("removes group when all documents are Reprovado", () => {
    const input = {
      titular: [
        { tipo: "RG Principal", url: "a.pdf", situacao: "Reprovado" },
      ],
      conjuge: [
        { tipo: "CPF Principal", url: "b.pdf" },
      ],
    };
    const result = filterDocuments(input);
    expect(result).not.toHaveProperty("titular");
    expect(result).toHaveProperty("conjuge");
  });

  it("keeps documents without situacao field (undefined)", () => {
    const input = {
      titular: [{ tipo: "RG Principal", url: "a.pdf" }],
    };
    const result = filterDocuments(input);
    expect(result.titular).toHaveLength(1);
  });

  it("keeps groups with at least one valid document", () => {
    const input = {
      grupo1: [
        { tipo: "RG Principal", url: "a.pdf" },
        { tipo: "CPF Principal", url: "b.pdf" },
        { tipo: "Outros", url: "c.pdf" },
      ],
    };
    const result = filterDocuments(input);
    expect(result.grupo1).toHaveLength(2);
    expect(result.grupo1).toEqual([
      { tipo: "RG Principal", url: "a.pdf" },
      { tipo: "CPF Principal", url: "b.pdf" },
    ]);
  });
});
