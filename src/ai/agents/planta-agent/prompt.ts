import { BASE_PROMPT } from "@/ai/_base/basePrompt";

export const PLANTA_PROMPT = `${BASE_PROMPT}

DOCUMENT_TYPE: Planta (Floor plan / unit specification)

SCHEMA:
{
  "document_type": "Planta",
  "schema_version": "1.0",
  "output": [
    {
      "bloco": "string",
      "unidade": "string",
    }
  ]
}

SPECIFIC RULES:
- Return one item per apartment/unit (apto) found in the document.
- If the document contains multiple blocks/units, return all of them in the array.
- If the document is not a floor plan, return an empty array in output.
`;
