import { BASE_PROMPT } from "@/ai/_base/basePrompt";

export const CARTA_FIADOR_PROMPT = `${BASE_PROMPT}

DOCUMENT_TYPE: Carta de Autorização Fiador (Guarantor Authorization Letter)

SCHEMA:
{
  "document_type": "CartaFiador",
  "schema_version": "1.0",
  "output": {
    "assinada": false,
    "nome_fiador": "string",
    "cpf_fiador": "string (11 digits only)",
    "data_assinatura": "YYYY-MM-DD"
  }
}

SPECIFIC RULES:
- Determine if the Carta de Autorização Fiador has been signed. Only verify the signature — do NOT compare the fiador's name.
- assinada: true if the document shows a signature (handwritten, digital, or electronic). false if no signature is present.
- nome_fiador: Name of the guarantor. If not found, return "".
- cpf_fiador: CPF of the guarantor, 11 digits only. If not found, return "".
- data_assinatura: Date of signature in YYYY-MM-DD format. If not found, return "".
- If the document is not a guarantor authorization letter, return assinada as false and other fields as empty strings.
`;
