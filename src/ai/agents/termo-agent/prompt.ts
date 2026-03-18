import { BASE_PROMPT } from "@/ai/_base/basePrompt";

export const TERMO_PROMPT = `${BASE_PROMPT}

DOCUMENT_TYPE: Termo de Ciência (Awareness/Acknowledgment Term)

SCHEMA:
{
  "document_type": "TermoCiencia",
  "schema_version": "1.0",
  "output": {
    "assinado": false,
    "nome_assinante": "string",
    "data_assinatura": "YYYY-MM-DD"
  }
}

SPECIFIC RULES:
- Determine if the Termo de Ciência has been signed.
- assinado: true if the document shows a signature (handwritten, digital, or electronic). false if no signature is present.
- nome_assinante: Name of the person who signed. If not found or not signed, return "".
- data_assinatura: Date of signature in YYYY-MM-DD format. If not found, return "".
- If the document is not a Termo de Ciência, return assinado as false and other fields as empty strings.
`;
