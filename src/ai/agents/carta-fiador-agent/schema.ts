import { z } from "zod";

export const cartaFiadorSchema = z.object({
  document_type: z.literal("CartaFiador"),
  schema_version: z.literal("1.0"),
  output: z.object({
    assinada: z.boolean(),
    nome_fiador: z.string(),
    cpf_fiador: z.string(),
    data_assinatura: z.string(),
  }),
});

export type CartaFiadorOutput = z.infer<typeof cartaFiadorSchema>;
