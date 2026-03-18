import { z } from "zod";

export const certidaoEstadoCivilSchema = z.object({
  document_type: z.literal("CertidaoEstadoCivil"),
  schema_version: z.literal("1.0"),
  output: z.object({
    tipo: z.string(),
    nome: z.string(),
    nome_conjuge: z.string(),
    estado_civil: z.string(),
    alteracao_de_nome: z.boolean(),
    nome_anterior: z.string(),
    nome_atual: z.string(),
    data_nascimento: z.string(),
    filiacao1: z.string(),
    filiacao2: z.string(),
  }),
});

export type CertidaoEstadoCivilOutput = z.infer<typeof certidaoEstadoCivilSchema>;
