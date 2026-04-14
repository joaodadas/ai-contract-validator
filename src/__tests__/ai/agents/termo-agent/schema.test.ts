import { termoSchema } from "@/ai/agents/termo-agent/schema";

describe("termoSchema", () => {
  const validBase = {
    document_type: "TermoCiencia",
    schema_version: "1.1",
    output: {
      assinado: true,
      nome_assinante: "João Silva",
      data_assinatura: "2026-01-15",
      tipo_assinatura: "manuscrita",
    },
  };

  describe("tipo_assinatura", () => {
    it("accepts all valid enum values", () => {
      const values = ["manuscrita", "digital_icp_brasil", "gov_br", "eletronica", "nao_assinado"] as const;
      for (const tipo of values) {
        const data = { ...validBase, output: { ...validBase.output, tipo_assinatura: tipo } };
        const result = termoSchema.safeParse(data);
        expect(result.success).toBe(true);
      }
    });

    it("accepts missing tipo_assinatura (optional field)", () => {
      const { tipo_assinatura: _, ...outputWithout } = validBase.output;
      const data = { ...validBase, output: outputWithout };
      const result = termoSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("rejects invalid tipo_assinatura value", () => {
      const data = { ...validBase, output: { ...validBase.output, tipo_assinatura: "carimbo" } };
      const result = termoSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("schema_version", () => {
    it("accepts version 1.1", () => {
      const result = termoSchema.safeParse(validBase);
      expect(result.success).toBe(true);
    });

    it("rejects old version 1.0", () => {
      const data = { ...validBase, schema_version: "1.0" };
      const result = termoSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
