import { BASE_PROMPT } from "@/ai/_base/basePrompt";

export const ATO_PROMPT = `${BASE_PROMPT}

DOCUMENT_TYPE: Ato (Comprovante de Pagamento / ATO)

SCHEMA:
{
  "document_type": "Ato",
  "schema_version": "1.0",
  "output": {
    "valor_total": 0
  }
}

SPECIFIC RULES:
- Only extract data if the document is a comprovante de pagamento (ATO).
- Scheduling receipts (comprovante de agendamento) are NOT valid as proof of payment, return "valor_total" 0.
- If the document is NOT a comprovante de pagamento, return valor_total = 0.
- If there are MULTIPLE comprovantes in the same file/text, SUM all values into valor_total.
- Normalize money values: remove "R$", replace dots (thousands separator) and commas (decimal), result as number with dot decimal.
  Example: "R$ 1.250,00" → 1250.00
`;
