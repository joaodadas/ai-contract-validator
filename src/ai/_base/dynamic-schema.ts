import { z, ZodTypeAny } from "zod";
import type { DynamicFieldDefinition } from "./dynamic-types";

/**
 * Constrói um ZodSchema recursivamente a partir de um array de definições de campos.
 */
export function buildDynamicSchema(fields: DynamicFieldDefinition[]): z.ZodObject<any> {
  const shape: Record<string, ZodTypeAny> = {};

  for (const field of fields) {
    let zodField = buildFieldSchema(field);
    
    if (field.description) {
      zodField = zodField.describe(field.description);
    }
    
    shape[field.name] = zodField;
  }

  // Envolvemos em um objeto principal "output" com metadados básicos,
  // seguindo o padrão atual do sistema (ex: document_type, schema_version)
  return z.object({
    document_type: z.string().describe("Identificador do tipo de documento extraído"),
    schema_version: z.string().optional().describe("Versão do schema utilizado"),
    output: z.object(shape).describe("Dados extraídos do documento"),
  });
}

function buildFieldSchema(field: DynamicFieldDefinition): ZodTypeAny {
  switch (field.type) {
    case "string":
      return z.string().nullable().default(null); // nullable por segurança caso a IA não encontre
    
    case "number":
      return z.number().nullable().default(null);
      
    case "boolean":
      return z.boolean().nullable().default(null);
      
    case "object":
      if (!field.fields || field.fields.length === 0) {
        return z.record(z.string(), z.any()).nullable().default(null); // fallback
      }
      const shape: Record<string, ZodTypeAny> = {};
      for (const subField of field.fields) {
        let subZodField = buildFieldSchema(subField);
        if (subField.description) {
          subZodField = subZodField.describe(subField.description);
        }
        shape[subField.name] = subZodField;
      }
      return z.object(shape).nullable().default(null);
      
    case "array":
      if (!field.items) {
        return z.array(z.any()).nullable().default(null); // fallback
      }
      let itemZodField = buildFieldSchema(field.items);
      if (field.items.description) {
        itemZodField = itemZodField.describe(field.items.description);
      }
      return z.array(itemZodField).nullable().default(null);
      
    default:
      return z.any();
  }
}
