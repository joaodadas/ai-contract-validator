import { BASE_PROMPT } from "@/ai/_base/basePrompt";

export const FLUXO_PROMPT = `${BASE_PROMPT}

DOCUMENT_TYPE: Fluxo (Payment flow / installment plan)

SCHEMA:
{
  "document_type": "Fluxo",
  "schema_version": "1.0",
  "output": {
    "valores_detalhados": [
      { "data": "YYYY-MM-DD", "descricao": "string", "valor": 0 }
    ],
    "valor_total": 0,
    "numero_parcelas": 0,
    "valor_parcela": 0
  }
}

SPECIFIC RULES:
- Extract each payment entry into valores_detalhados with date, description, and value.
- valor_total MUST equal the sum of all valores_detalhados[].valor. Calculate it yourself.
- If numero_parcelas is not explicitly found in the document, return 0 (not null).
- If valor_parcela is not explicitly found, return 0.
- Dates must be in YYYY-MM-DD format.
- All monetary values must be numbers with dot decimal.
`;
