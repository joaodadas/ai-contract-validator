import { z } from "zod";

export const plantaSchema = z.object({
  document_type: z.literal("Planta"),
  schema_version: z.literal("1.0"),
  output: z.array(
    z.object({
      bloco: z.string(),
      apto: z.string(),
      quartos: z.number(),
      banheiros: z.number(),
      vagas: z.number(),
      area_privativa_m2: z.number(),
    })
  ),
});

export type PlantaOutput = z.infer<typeof plantaSchema>;
