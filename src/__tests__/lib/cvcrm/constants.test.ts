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
    ["Planilha calculo 10858", "fluxo-agent"],
    ["Fluxo - SAM", "fluxo-agent"],
    ["Memorial Descritivo", "planta-agent"],
    ["Planta", "planta-agent"],
    ["Termo de Ciência", "termo-agent"],
    ["Instrumento Particular", "ato-agent"],
    ["Promessa de Compra e Venda", "ato-agent"],
  ])('maps "%s" to "%s"', (name, expected) => {
    expect(contractNameToAgent(name)).toBe(expected);
  });

  it("returns null for unknown contract names", () => {
    expect(contractNameToAgent("Random contract")).toBeNull();
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
