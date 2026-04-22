import { ModelKey } from "./types";

export type DynamicFieldType = "string" | "number" | "boolean" | "object" | "array";

export interface DynamicFieldDefinition {
  name: string;
  type: DynamicFieldType;
  description?: string;
  
  // Se type === 'object', contém os campos internos
  fields?: DynamicFieldDefinition[];
  
  // Se type === 'array', contém a definição do tipo do item
  items?: DynamicFieldDefinition;
}

export interface DynamicAgentConfig {
  id: string; // Ex: 'cnh-agent'
  name: string; // Ex: 'CNH'
  description?: string;
  prompt: string;
  modelKey?: ModelKey;
  schema: DynamicFieldDefinition[];
  isActive: boolean;
}
