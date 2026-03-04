import { z } from "zod";

export const fluxoSchema = z.object({
  document_type: z.literal("Fluxo"),
  schema_version: z.literal("1.0"),
  output: z.object({
    valores_detalhados: z.array(
      z.object({
        data: z.string(),
        descricao: z.string(),
        valor: z.number(),
      })
    ),
    valor_total: z.number(),
    numero_parcelas: z.number(),
    valor_parcela: z.number(),
  }),
});

export type FluxoOutput = z.infer<typeof fluxoSchema>;
