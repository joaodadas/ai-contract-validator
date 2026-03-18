import { z } from "zod";

export const carteiraTrabalhoSchema = z.object({
  document_type: z.literal("CarteiraTrabalho"),
  schema_version: z.literal("1.0"),
  output: z.object({
    nome: z.string(),
    cpf: z.string(),
    com_foto: z.boolean(),
    ocupacao: z.string(),
    empresa: z.string(),
    data_admissao: z.string(),
    renda: z.number(),
  }),
});

export type CarteiraTrabalhoOutput = z.infer<typeof carteiraTrabalhoSchema>;
