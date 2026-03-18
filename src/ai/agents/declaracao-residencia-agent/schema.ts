import { z } from "zod";

export const declaracaoResidenciaSchema = z.object({
  document_type: z.literal("DeclaracaoResidencia"),
  schema_version: z.literal("1.0"),
  output: z.object({
    nome_morador_declarado: z.string(),
    nome_titular: z.string(),
    logradouro: z.string(),
    numero: z.string(),
    complemento: z.string(),
    bairro: z.string(),
    cidade: z.string(),
    estado: z.string(),
    cep: z.string(),
  }),
});

export type DeclaracaoResidenciaOutput = z.infer<typeof declaracaoResidenciaSchema>;
