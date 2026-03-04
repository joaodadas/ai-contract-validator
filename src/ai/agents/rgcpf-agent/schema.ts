import { z } from "zod";

export const rgcpfSchema = z.object({
  document_type: z.literal("RGCPF"),
  schema_version: z.literal("1.0"),
  output: z.object({
    nome: z.string(),
    rg: z.string(),
    cpf: z.string(),
    data_nascimento: z.string(),
    estado_civil: z.string(),
    filiacao1: z.string(),
    filiacao2: z.string(),
  }),
});

export type RgcpfOutput = z.infer<typeof rgcpfSchema>;
