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

  // ── Edge cases ────────────────────────────────────────────

  it("excludes Ignorado status items from report", () => {
    const data = makeAllIgual();
    data.Termo = { status: "Ignorado", detalhes: "Sem termo" };
    const result = formatValidationReport(data);
    expect(result).toBe("Nenhuma divergência encontrada");
  });

  it("includes multiple divergences in separate sections", () => {
    const data = makeAllIgual();
    data.financeiro.financiamento = { status: "Divergente", detalhes: "Diff R$ 1693" };
    data.financeiro.subsidio = { status: "Divergente", detalhes: "Diff R$ 1693" };
    const result = formatValidationReport(data);
    expect(result).toContain("Financiamento");
    expect(result).toContain("Subsidio");
    // Two sections separated by double newline
    expect(result.split("\n\n").length).toBeGreaterThanOrEqual(2);
  });

  it("formats dates from YYYY-MM-DD to DD-MM-YYYY in detalhes", () => {
    const data = makeAllIgual();
    data.financeiro.parcelas_mensais = {
      status: "Divergente",
      detalhes: "Data início: 2026-04-30 vs 2026-05-30",
    };
    const result = formatValidationReport(data);
    expect(result).toContain("30-04-2026");
    expect(result).toContain("30-05-2026");
    expect(result).not.toContain("2026-04-30");
  });

  it("formats dates in status field too", () => {
    const data = makeAllIgual();
    data.financeiro.chaves = {
      status: "Diferente: 2027-10-20 vs 2027-11-20",
      detalhes: "",
    };
    const result = formatValidationReport(data);
    expect(result).toContain("20-10-2027");
    expect(result).not.toContain("2027-10-20");
  });

  it("handles pessoa with Ignorado status — excluded from report", () => {
    const data = makeAllIgual();
    data.pessoas = [
      { papel: "fiador", status: "Ignorado", detalhes: "" },
    ];
    const result = formatValidationReport(data);
    expect(result).toBe("Nenhuma divergência encontrada");
  });

  it("formats keys with underscores into capitalized words", () => {
    const data = makeAllIgual();
    data.dados_imovel.nome_empreendimento = {
      status: "Divergente",
      detalhes: "Kentucky vs Kentuky",
    };
    const result = formatValidationReport(data);
    expect(result).toContain("Nome Empreendimento");
  });

  it("handles mix of Igual, Divergente, and Ignorado across all fields", () => {
    const data = makeAllIgual();
    data.Termo = { status: "Ignorado", detalhes: "" };
    data.Documentos = { status: "Ignorado", detalhes: "" };
    data.financeiro.financiamento = { status: "Divergente", detalhes: "Erro" };
    data.pessoas = [
      { papel: "titular", status: "Igual", detalhes: "" },
      { papel: "conjuge", status: "Divergente", detalhes: "CPF errado" },
    ];

    const result = formatValidationReport(data);

    // Only financiamento and conjuge should appear
    expect(result).toContain("Financiamento");
    expect(result).toContain("Conjuge");
    expect(result).not.toContain("Termo");
    expect(result).not.toContain("Documentos");
    expect(result).not.toContain("Titular");
  });
});
