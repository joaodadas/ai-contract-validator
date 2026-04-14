import { z } from "zod";

export const termoSchema = z.object({
  document_type: z.literal("TermoCiencia"),
  schema_version: z.literal("1.1"),
  output: z.object({
    assinado: z.boolean(),
    nome_assinante: z.string(),
    data_assinatura: z.string(),
    tipo_assinatura: z.enum([
      "manuscrita",
      "digital_icp_brasil",
      "gov_br",
      "eletronica",
      "nao_assinado",
    ]).optional(),
  }),
});

export type TermoOutput = z.infer<typeof termoSchema>;
