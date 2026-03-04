import { z } from "zod";

export const quadroResumoSchema = z.object({
  document_type: z.literal("QuadroResumo"),
  schema_version: z.literal("1.0"),
  output: z.object({
    valor_avaliacao: z.number(),
    valor_minimo: z.number(),
    valor_primeira_praca: z.number(),
    valor_segunda_praca: z.number(),
    data_primeira_praca: z.string(),
    data_segunda_praca: z.string(),
    hora_primeira_praca: z.string(),
    hora_segunda_praca: z.string(),
  }),
});

export type QuadroResumoOutput = z.infer<typeof quadroResumoSchema>;
