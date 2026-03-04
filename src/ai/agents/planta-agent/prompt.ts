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
      "apto": "string",
      "quartos": 0,
      "banheiros": 0,
      "vagas": 0,
      "area_privativa_m2": 0
    }
  ]
}

SPECIFIC RULES:
- Return one item per apartment/unit (apto) found in the document.
- If the document contains multiple blocks/apartments, return all of them in the array.
- If counts (quartos, banheiros, vagas) are not found, return 0.
- area_privativa_m2 should be a number (e.g. 65.50).
- If the document is not a floor plan, return an empty array in output.
`;
