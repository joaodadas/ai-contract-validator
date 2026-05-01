import { z } from "zod";

export const plantaSchema = z.object({
  document_type: z.literal("Planta"),
  schema_version: z.literal("1.0"),
  output: z.array(
    z.object({
      bloco: z.string(),
      unidade: z.string(),
    })
  ),
});

export type PlantaOutput = z.infer<typeof plantaSchema>;
