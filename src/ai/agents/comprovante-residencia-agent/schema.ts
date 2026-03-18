import { z } from "zod";

export const comprovanteResidenciaSchema = z.object({
  document_type: z.literal("ComprovanteResidencia"),
  schema_version: z.literal("1.0"),
  output: z.object({
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

export type ComprovanteResidenciaOutput = z.infer<typeof comprovanteResidenciaSchema>;
