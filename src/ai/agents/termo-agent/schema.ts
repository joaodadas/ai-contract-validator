import { z } from "zod";

export const termoSchema = z.object({
  document_type: z.literal("TermoCiencia"),
  schema_version: z.literal("1.0"),
  output: z.object({
    assinado: z.boolean(),
    nome_assinante: z.string(),
    data_assinatura: z.string(),
  }),
});

export type TermoOutput = z.infer<typeof termoSchema>;
