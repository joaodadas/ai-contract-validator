import { z } from "zod";

export const cnhSchema = z.object({
  document_type: z.literal("CNH"),
  schema_version: z.literal("1.0"),
  output: z.object({
    nacionalidade: z.string(),
    nome: z.string(),
    rg_ou_identidade: z.string(),
    cpf: z.string(),
    filiacao1: z.string(),
    filiacao2: z.string(),
  }),
});

export type CnhOutput = z.infer<typeof cnhSchema>;
