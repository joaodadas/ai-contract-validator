import { BASE_PROMPT } from "@/ai/_base/basePrompt";

export const QUADRO_RESUMO_PROMPT = `${BASE_PROMPT}

DOCUMENT_TYPE: Quadro Resumo (Summary Table of auction/sale)

SCHEMA:
{
  "document_type": "QuadroResumo",
  "schema_version": "1.0",
  "output": {
    "valor_avaliacao": 0,
    "valor_minimo": 0,
    "valor_primeira_praca": 0,
    "valor_segunda_praca": 0,
    "data_primeira_praca": "YYYY-MM-DD",
    "data_segunda_praca": "YYYY-MM-DD",
    "hora_primeira_praca": "HH:MM",
    "hora_segunda_praca": "HH:MM"
  }
}

SPECIFIC RULES:
- Extract auction/sale summary values from the document.
- All monetary values must be numbers with dot decimal (e.g. 150000.00).
- Dates must be in YYYY-MM-DD format.
- Hours must be in HH:MM format (24h).
- If a value is not found, return 0 for numbers and "" for strings.
`;
