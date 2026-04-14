import { validationSchema } from "@/ai/agents/validation-agent/schema";

function makeValidOutput() {
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
    pessoas: [
      { papel: "titular", status: "Igual", detalhes: "" },
    ],
    validacao_endereco: { status: "Igual", detalhes: "" },
    Documentos: { status: "Igual", detalhes: "" },
  };
}

describe("validationSchema", () => {
  describe("pessoas array", () => {
    it("accepts array with one pessoa", () => {
      const result = validationSchema.safeParse(makeValidOutput());
      expect(result.success).toBe(true);
    });

    it("accepts array with multiple pessoas", () => {
      const data = makeValidOutput();
      data.pessoas = [
        { papel: "titular", status: "Igual", detalhes: "" },
        { papel: "conjuge", status: "Divergente", detalhes: "CPF divergente" },
      ];
      const result = validationSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pessoas).toHaveLength(2);
      }
    });

    it("accepts empty pessoas array", () => {
      const data = makeValidOutput();
      data.pessoas = [];
      const result = validationSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("requires papel, status, detalhes per pessoa", () => {
      const data = makeValidOutput();
      data.pessoas = [{ papel: "titular" } as never];
      const result = validationSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("validacao_endereco at root level", () => {
    it("accepts validacao_endereco as sibling of dados_imovel", () => {
      const result = validationSchema.safeParse(makeValidOutput());
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.validacao_endereco).toEqual({ status: "Igual", detalhes: "" });
      }
    });
  });

  describe("rejects old format", () => {
    it("rejects pessoas as object with titular/conjuge/comprador keys", () => {
      const data = {
        ...makeValidOutput(),
        pessoas: {
          titular: { status: "Igual", detalhes: "" },
          conjuge: { status: "Igual", detalhes: "" },
          comprador: { status: "Igual", detalhes: "" },
          validacao_endereco: { status: "Igual", detalhes: "" },
        },
      };
      const result = validationSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
