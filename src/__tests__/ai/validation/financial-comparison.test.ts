import { compareFinancials } from "@/ai/validation/financial-comparison";

// Helper to build a minimal FluxoFinanceiro
function makeFluxo(overrides: Record<string, unknown> = {}) {
  return {
    valor_venda_total: 246800,
    sinal_ato: 500,
    financiamento_bancario: 181955.89,
    subsidio: 1693,
    subsidio_outros: 20000,
    parcelas_mensais: [
      {
        nome_grupo: "Mensais",
        qtd_parcelas: 120,
        valor_parcela: 350,
        valor_total_grupo: 42000,
        data_inicio: "2024-06-15",
        data_fim: "2034-05-15",
      },
    ],
    reforcos_anuais: [
      { descricao: "Reforco Anual 1", valor: 500, data_vencimento: "2025-01-15" },
    ],
    chaves: { valor: 1151.11, data_vencimento: "2026-06-01" },
    pos_chaves: [
      {
        nome_grupo: "Pos-Chaves",
        qtd_parcelas: 24,
        valor_parcela: 200,
        valor_total_grupo: 4800,
        data_inicio: "2026-07-01",
        data_fim: "2028-06-01",
      },
    ],
    ...overrides,
  };
}

// Helper to build a minimal QuadroFinanceiro that matches the default fluxo
function makeQuadro(overrides: Record<string, unknown> = {}) {
  return {
    valor_venda_total: 246800,
    sinal_ato: 500,
    financiamento_bancario: 181955.89,
    subsidio_total: 21693,
    parcelas_mensais: [
      {
        nome_grupo: "Mensais",
        qtd_parcelas: 120,
        valor_parcela: 350,
        valor_total_grupo: 42000,
        data_inicio: "2024-06-15",
        data_fim: "2034-05-15",
      },
    ],
    reforcos_anuais: [
      { descricao: "Reforco Anual 1", valor: 500, data_vencimento: "2025-01-15" },
    ],
    chaves: { valor: 1151.11, vencimento: "2026-06-01" },
    pos_chaves: [
      {
        nome_grupo: "Pos-Chaves",
        qtd_parcelas: 24,
        valor_parcela: 200,
        valor_total_grupo: 4800,
        data_inicio: "2026-07-01",
        data_fim: "2028-06-01",
      },
    ],
    data_entrega_imovel: "2026-06-01",
    ...overrides,
  };
}

describe("compareFinancials", () => {
  describe("All OK (exact match)", () => {
    it("returns APROVADO when all values match exactly", () => {
      const fluxo = makeFluxo();
      const quadro = makeQuadro();

      const result = compareFinancials(fluxo, quadro);

      expect(result.status_geral).toContain("APROVADO");
      expect(Object.keys(result.divergencias)).toHaveLength(0);
      expect(Object.keys(result.todos_resultados)).toHaveLength(8);

      for (const item of Object.values(result.todos_resultados)) {
        expect(item.status).toBe("OK");
      }
    });
  });

  describe("All OK with tolerance", () => {
    it("returns OK when diff is within tolerance (0.50)", () => {
      const fluxo = makeFluxo({ valor_venda_total: 246800.5 });
      const quadro = makeQuadro({ valor_venda_total: 246800.0 });

      const result = compareFinancials(fluxo, quadro);

      expect(result.todos_resultados.valor_venda_total.status).toBe("OK");
      expect(result.todos_resultados.valor_venda_total.diferenca).toBe("0.50");
      expect(result.status_geral).toContain("APROVADO");
    });
  });

  describe("Tolerance boundary", () => {
    it("returns OK when diff is exactly 0.99 (below tolerance)", () => {
      const fluxo = makeFluxo({ valor_venda_total: 246800.99 });
      const quadro = makeQuadro({ valor_venda_total: 246800.0 });

      const result = compareFinancials(fluxo, quadro);

      expect(result.todos_resultados.valor_venda_total.status).toBe("OK");
    });

    it("returns DIVERGENTE when diff is 1.01 (above tolerance)", () => {
      const fluxo = makeFluxo({ valor_venda_total: 246801.01 });
      const quadro = makeQuadro({ valor_venda_total: 246800.0 });

      const result = compareFinancials(fluxo, quadro);

      expect(result.todos_resultados.valor_venda_total.status).toBe("DIVERGENTE");
      expect(result.divergencias).toHaveProperty("valor_venda_total");
      expect(result.status_geral).toContain("DIVERG");
    });

    it("returns OK when diff is exactly at the boundary (abs < 1.0 means 0.999... is OK)", () => {
      // TOLERANCE = 1.0, condition is absDiff < TOLERANCE (strict less-than)
      // So diff = 1.0 exactly should be DIVERGENTE
      const fluxo = makeFluxo({ valor_venda_total: 246801.0 });
      const quadro = makeQuadro({ valor_venda_total: 246800.0 });

      const result = compareFinancials(fluxo, quadro);

      // diff = 1.0, which is NOT < 1.0, so DIVERGENTE
      expect(result.todos_resultados.valor_venda_total.status).toBe("DIVERGENTE");
    });
  });

  describe("Null inputs", () => {
    it("returns ERRO when fluxo is null", () => {
      const result = compareFinancials(null, makeQuadro());

      expect(result.status_geral).toContain("ERRO");
      expect(Object.keys(result.divergencias)).toHaveLength(0);
      expect(Object.keys(result.todos_resultados)).toHaveLength(0);
    });

    it("returns ERRO when quadro is null", () => {
      const result = compareFinancials(makeFluxo(), null);

      expect(result.status_geral).toContain("ERRO");
      expect(Object.keys(result.divergencias)).toHaveLength(0);
      expect(Object.keys(result.todos_resultados)).toHaveLength(0);
    });

    it("returns ERRO when both are null", () => {
      const result = compareFinancials(null, null);

      expect(result.status_geral).toContain("ERRO");
    });

    it("returns ERRO when fluxo is undefined", () => {
      const result = compareFinancials(undefined, makeQuadro());

      expect(result.status_geral).toContain("ERRO");
    });

    it("returns ERRO when quadro is undefined", () => {
      const result = compareFinancials(makeFluxo(), undefined);

      expect(result.status_geral).toContain("ERRO");
    });
  });

  describe("Subsidio aggregation", () => {
    it("sums fluxo.subsidio + fluxo.subsidio_outros and compares to quadro.subsidio_total", () => {
      const fluxo = makeFluxo({ subsidio: 1693, subsidio_outros: 20000 });
      const quadro = makeQuadro({ subsidio_total: 21693 });

      const result = compareFinancials(fluxo, quadro);

      expect(result.todos_resultados.subsidio.status).toBe("OK");
      expect(result.todos_resultados.subsidio.fluxo).toBe("21693.00");
      expect(result.todos_resultados.subsidio.quadro).toBe("21693.00");
      expect(result.todos_resultados.subsidio.diferenca).toBe("0.00");
    });

    it("detects divergence when subsidio aggregation does not match", () => {
      const fluxo = makeFluxo({ subsidio: 1693, subsidio_outros: 20000 });
      const quadro = makeQuadro({ subsidio_total: 20000 });

      const result = compareFinancials(fluxo, quadro);

      expect(result.todos_resultados.subsidio.status).toBe("DIVERGENTE");
      expect(result.divergencias).toHaveProperty("subsidio");
    });
  });

  describe("Empty arrays", () => {
    it("returns OK for parcelas_mensais when both sides have empty arrays", () => {
      const fluxo = makeFluxo({ parcelas_mensais: [] });
      const quadro = makeQuadro({ parcelas_mensais: [] });

      const result = compareFinancials(fluxo, quadro);

      expect(result.todos_resultados.parcelas_mensais.status).toBe("OK");
      expect(result.todos_resultados.parcelas_mensais.fluxo).toBe("0.00");
      expect(result.todos_resultados.parcelas_mensais.quadro).toBe("0.00");
    });

    it("returns OK for reforcos_anuais when both sides have empty arrays", () => {
      const fluxo = makeFluxo({ reforcos_anuais: [] });
      const quadro = makeQuadro({ reforcos_anuais: [] });

      const result = compareFinancials(fluxo, quadro);

      expect(result.todos_resultados.reforcos_anuais.status).toBe("OK");
    });

    it("returns OK for pos_chaves when both sides have empty arrays", () => {
      const fluxo = makeFluxo({ pos_chaves: [] });
      const quadro = makeQuadro({ pos_chaves: [] });

      const result = compareFinancials(fluxo, quadro);

      expect(result.todos_resultados.pos_chaves.status).toBe("OK");
    });

    it("detects divergence when one side has data and the other is empty", () => {
      const fluxo = makeFluxo({
        parcelas_mensais: [
          {
            nome_grupo: "Mensais",
            qtd_parcelas: 10,
            valor_parcela: 100,
            valor_total_grupo: 1000,
            data_inicio: "2024-01-01",
            data_fim: "2024-12-01",
          },
        ],
      });
      const quadro = makeQuadro({ parcelas_mensais: [] });

      const result = compareFinancials(fluxo, quadro);

      expect(result.todos_resultados.parcelas_mensais.status).toBe("DIVERGENTE");
      expect(result.divergencias).toHaveProperty("parcelas_mensais");
    });
  });

  describe("Real data test (Kentucky 22718)", () => {
    it("produces the expected comparison for Kentucky 22718 extraction data", () => {
      const fluxo = {
        valor_venda_total: 246800,
        sinal_ato: 500,
        financiamento_bancario: 181955.89,
        subsidio: 1693,
        subsidio_outros: 20000,
        parcelas_mensais: [
          {
            nome_grupo: "Parcelas Mensais",
            qtd_parcelas: 41,
            valor_parcela: 362.37,
            valor_total_grupo: 14857.17,
            data_inicio: "2024-10-28",
            data_fim: "2028-02-28",
          },
        ],
        reforcos_anuais: [
          { descricao: "Reforco Anual 1", valor: 3000, data_vencimento: "2025-08-28" },
          { descricao: "Reforco Anual 2", valor: 3000, data_vencimento: "2026-08-28" },
          { descricao: "Reforco Anual 3", valor: 3000, data_vencimento: "2027-08-28" },
        ],
        chaves: { valor: 18793.94, data_vencimento: "2028-03-28" },
        pos_chaves: [] as { nome_grupo: string; qtd_parcelas: number; valor_parcela: number; valor_total_grupo: number; data_inicio: string; data_fim: string }[],
      };

      const quadro = {
        valor_venda_total: 246800,
        sinal_ato: 500,
        financiamento_bancario: 183648.89,
        subsidio_total: 21693,
        parcelas_mensais: [
          {
            nome_grupo: "Parcelas Mensais",
            qtd_parcelas: 41,
            valor_parcela: 362.37,
            valor_total_grupo: 14857.17,
            data_inicio: "2024-10-28",
            data_fim: "2028-02-28",
          },
        ],
        reforcos_anuais: [
          { descricao: "Reforco Anual 1", valor: 3000, data_vencimento: "2025-08-28" },
          { descricao: "Reforco Anual 2", valor: 3000, data_vencimento: "2026-08-28" },
          { descricao: "Reforco Anual 3", valor: 3000, data_vencimento: "2027-08-28" },
        ],
        chaves: { valor: 18793.94, vencimento: "2028-03-28" },
        pos_chaves: [] as { nome_grupo: string; qtd_parcelas: number; valor_parcela: number; valor_total_grupo: number; data_inicio: string; data_fim: string }[],
        data_entrega_imovel: "2028-03-28",
      };

      const result = compareFinancials(fluxo, quadro);

      // Most items should match
      expect(result.todos_resultados.valor_venda_total.status).toBe("OK");
      expect(result.todos_resultados.sinal_ato.status).toBe("OK");
      expect(result.todos_resultados.subsidio.status).toBe("OK");
      expect(result.todos_resultados.parcelas_mensais.status).toBe("OK");
      expect(result.todos_resultados.reforcos_anuais.status).toBe("OK");
      expect(result.todos_resultados.chaves.status).toBe("OK");
      expect(result.todos_resultados.pos_chaves.status).toBe("OK");

      // Financiamento diverges: 181955.89 vs 183648.89 = diff of -1693.00
      expect(result.todos_resultados.financiamento.status).toBe("DIVERGENTE");
      expect(result.todos_resultados.financiamento.fluxo).toBe("181955.89");
      expect(result.todos_resultados.financiamento.quadro).toBe("183648.89");
      expect(result.todos_resultados.financiamento.diferenca).toBe("-1693.00");

      // Overall status should flag divergence
      expect(result.status_geral).toContain("DIVERG");
      expect(result.divergencias).toHaveProperty("financiamento");
      expect(Object.keys(result.divergencias)).toHaveLength(1);
    });
  });

  describe("Result structure", () => {
    it("includes correct labels in comparison items", () => {
      const result = compareFinancials(makeFluxo(), makeQuadro());

      expect(result.todos_resultados.valor_venda_total.item).toBe("Valor Total da Venda");
      expect(result.todos_resultados.sinal_ato.item).toBe("Sinal / Entrada");
      expect(result.todos_resultados.financiamento.item).toBe("Financiamento Bancário");
      expect(result.todos_resultados.subsidio.item).toBe("Subsídios");
      expect(result.todos_resultados.parcelas_mensais.item).toBe("Soma Parcelas Mensais");
      expect(result.todos_resultados.reforcos_anuais.item).toBe("Soma Reforços Anuais");
      expect(result.todos_resultados.chaves.item).toBe("Parcela de Chaves");
      expect(result.todos_resultados.pos_chaves.item).toBe("Soma Pós-Chaves");
    });

    it("formats monetary values with two decimal places", () => {
      const result = compareFinancials(makeFluxo(), makeQuadro());

      for (const item of Object.values(result.todos_resultados)) {
        expect(item.fluxo).toMatch(/^\d+\.\d{2}$/);
        expect(item.quadro).toMatch(/^\d+\.\d{2}$/);
        expect(item.diferenca).toMatch(/^-?\d+\.\d{2}$/);
      }
    });
  });
});
