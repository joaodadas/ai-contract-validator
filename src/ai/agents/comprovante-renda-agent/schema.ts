import { z } from "zod";

export const comprovanteRendaSchema = z.object({
  document_type: z.literal("ComprovanteRenda"),
  schema_version: z.literal("1.0"),
  output: z.object({
    nome: z.string(),
    cpf: z.string(),
    valor_renda: z.number(),
    tipo: z.string(),
    empresa: z.string(),
    data_referencia: z.string(),
  }),
});

export type ComprovanteRendaOutput = z.infer<typeof comprovanteRendaSchema>;
