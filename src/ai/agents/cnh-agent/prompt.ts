import { BASE_PROMPT } from "@/ai/_base/basePrompt";

export const CNH_PROMPT = `${BASE_PROMPT}

DOCUMENT_TYPE: CNH (Carteira Nacional de Habilitação)

SCHEMA:
{
  "document_type": "CNH",
  "schema_version": "1.0",
  "output": {
    "nacionalidade": "string",
    "nome": "string",
    "rg_ou_identidade": "string",
    "cpf": "string (11 digits only)",
    "filiacao1": "string (mother or first parent)",
    "filiacao2": "string (father or second parent)"
  }
}

SPECIFIC RULES:
- Extract personal data from a Brazilian CNH document.
- CPF must be 11 digits only, no dots or dashes.
- RG/Identidade: keep original format if present.
- Filiacao1 is typically the mother's name, Filiacao2 the father's name.
- If the document is not a CNH, return all fields as empty strings.
`;
