import { z } from "zod";

export const atoSchema = z.object({
  document_type: z.literal("Ato"),
  schema_version: z.literal("1.0"),
  output: z.object({
    valor_total: z.number(),
  }),
});

export type AtoOutput = z.infer<typeof atoSchema>;
