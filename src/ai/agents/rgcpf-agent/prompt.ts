import { BASE_PROMPT } from "@/ai/_base/basePrompt";

export const RGCPF_PROMPT = `${BASE_PROMPT}

DOCUMENT_TYPE: RG/CPF (Registro Geral / Cadastro de Pessoa Física)

SCHEMA:
{
  "document_type": "RGCPF",
  "schema_version": "1.0",
  "output": {
    "nome": "string",
    "rg": "string",
    "cpf": "string (11 digits only)",
    "data_nascimento": "string (YYYY-MM-DD)",
    "estado_civil": "string",
    "filiacao1": "string (mother or first parent)",
    "filiacao2": "string (father or second parent)"
  }
}

SPECIFIC RULES:
- Extract personal data from Brazilian RG or CPF documents.
- CPF must be 11 digits only, no dots or dashes.
- Date of birth must be normalized to YYYY-MM-DD.
- Estado civil: solteiro, casado, divorciado, viuvo, separado, uniao estavel — lowercase.
- If the document is not an RG or CPF, return all fields as empty strings.
`;
