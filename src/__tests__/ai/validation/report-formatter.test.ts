import { formatValidationReport } from "@/ai/validation/report-formatter";
import type { ValidationOutput } from "@/ai/agents/validation-agent/schema";

function makeAllIgual(): ValidationOutput {
  return {
    dados_imovel: {
      nome_empreendimento: { status: "Igual", detalhes: "" },
      unidade_bloco: { status: "Igual", detalhes: "" },
    },
    financeiro: {
      valor_venda_total: { status: "Igual", detalhes: "" },
      financiamento: { status: "Igual", detalhes: "" },
      subsidio: { status: "Igual", detalhes: "" },
      parcelas_mensais: { status: "Igual", detalhes: "" },
      chaves: { status: "Igual", detalhes: "" },
      pos_chaves: { status: "Igual", detalhes: "" },
    },
    Termo: { status: "Igual", detalhes: "" },
    pessoas: [],
    validacao_endereco: { status: "Igual", detalhes: "" },
    Documentos: { status: "Igual", detalhes: "" },
  };
}

describe("formatValidationReport", () => {
  it("returns no divergences for all-Igual output", () => {
    const result = formatValidationReport(makeAllIgual());
    expect(result).toBe("Nenhuma divergência encontrada");
  });

  it("includes divergent pessoa from array", () => {
    const data = makeAllIgual();
    data.pessoas = [
      { papel: "titular", status: "Divergente", detalhes: "CPF divergente" },
    ];
    const result = formatValidationReport(data);
    expect(result).toContain("Titular");
    expect(result).toContain("CPF divergente");
  });

  it("excludes Igual pessoa from report", () => {
    const data = makeAllIgual();
    data.pessoas = [
      { papel: "titular", status: "Igual", detalhes: "" },
      { papel: "conjuge", status: "Divergente", detalhes: "RG faltando" },
    ];
    const result = formatValidationReport(data);
    expect(result).not.toContain("Titular");
    expect(result).toContain("Conjuge");
    expect(result).toContain("RG faltando");
  });

  it("handles empty pessoas array", () => {
    const data = makeAllIgual();
    data.pessoas = [];
    const result = formatValidationReport(data);
    expect(result).toBe("Nenhuma divergência encontrada");
  });

  it("includes divergent validacao_endereco at root level", () => {
    const data = makeAllIgual();
    data.validacao_endereco = { status: "Divergente", detalhes: "Endereço diferente" };
    const result = formatValidationReport(data);
    expect(result).toContain("Validacao Endereco");
    expect(result).toContain("Endereço diferente");
  });
});
