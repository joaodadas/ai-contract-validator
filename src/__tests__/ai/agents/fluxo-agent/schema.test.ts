import { fluxoSchema } from "@/ai/agents/fluxo-agent/schema";

function makeValidFluxo(overrides: Record<string, unknown> = {}) {
  return {
    document_type: "Fluxo",
    schema_version: "3.0",
    output: {
      dados_cadastrais: {
        empreendimento: "Kentucky",
        unidade: "101",
        bloco: "A",
        titulares: [
          { nome: "João Silva", cpf: "12345678900", score: 750 },
        ],
        ...overrides,
      },
      financeiro: {
        valor_venda_total: 500000,
        sinal_ato: 10000,
        financiamento_bancario: 300000,
        subsidio: 0,
        subsidio_outros: 0,
        financiamento_total: 300000,
        parcelas_mensais: [],
        reforcos_anuais: [],
        chaves: { valor: 50000, data_vencimento: "2027-12-15" },
        pos_chaves: [],
      },
    },
  };
}

describe("fluxoSchema", () => {
  describe("titulares array", () => {
    it("accepts single titular", () => {
      const data = makeValidFluxo();
      const result = fluxoSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("accepts multiple titulares", () => {
      const data = makeValidFluxo({
        titulares: [
          { nome: "João Silva", cpf: "12345678900", score: 750 },
          { nome: "Maria Silva", cpf: "98765432100", score: 680 },
        ],
      });
      const result = fluxoSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.output.dados_cadastrais.titulares).toHaveLength(2);
      }
    });

    it("accepts empty titulares array", () => {
      const data = makeValidFluxo({ titulares: [] });
      const result = fluxoSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("requires nome, cpf, and score per titular", () => {
      const data = makeValidFluxo({
        titulares: [{ nome: "João" }],
      });
      const result = fluxoSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("schema_version", () => {
    it("accepts version 3.0", () => {
      const result = fluxoSchema.safeParse(makeValidFluxo());
      expect(result.success).toBe(true);
    });

    it("rejects old version 2.0", () => {
      const data = { ...makeValidFluxo(), schema_version: "2.0" };
      const result = fluxoSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("financiamento_total", () => {
    it("accepts explicit financiamento_total", () => {
      const data = makeValidFluxo();
      data.output.financeiro.financiamento_total = 350000;
      const result = fluxoSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.output.financeiro.financiamento_total).toBe(350000);
      }
    });

    it("defaults financiamento_total to 0 when omitted", () => {
      const data = makeValidFluxo();
      delete (data.output.financeiro as { financiamento_total?: number }).financiamento_total;
      const result = fluxoSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.output.financeiro.financiamento_total).toBe(0);
      }
    });
  });

  describe("rejects old format", () => {
    it("rejects nome_titular/cpf_titular at root level", () => {
      const data = makeValidFluxo({
        nome_titular: "João",
        cpf_titular: "12345678900",
        score: 750,
        titulares: undefined,
      });
      const result = fluxoSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
