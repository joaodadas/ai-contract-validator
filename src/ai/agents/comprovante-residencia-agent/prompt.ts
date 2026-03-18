import { BASE_PROMPT } from "@/ai/_base/basePrompt";

export const COMPROVANTE_RESIDENCIA_PROMPT = `${BASE_PROMPT}

DOCUMENT_TYPE: Comprovante de Residência (Proof of Address)

SCHEMA:
{
  "document_type": "ComprovanteResidencia",
  "schema_version": "1.0",
  "output": {
    "nome_titular": "string",
    "logradouro": "string",
    "numero": "string",
    "complemento": "string",
    "bairro": "string",
    "cidade": "string",
    "estado": "string",
    "cep": "string"
  }
}

SPECIFIC RULES:
- Extract address information from a proof of residence document (conta de luz, água, telefone, internet, etc.).
- nome_titular: The name of the person on the bill/document. This is critical for ownership validation.
- logradouro: Street name (Rua, Avenida, etc.) WITHOUT the number.
- numero: House/building number only.
- complemento: Apartment, block, floor info if present. If not found, return "".
- bairro: Neighborhood name.
- cidade: City name.
- estado: State name or abbreviation (e.g. "PR", "Paraná", "SP").
- cep: ZIP code, digits only (8 digits). If not found, return "".
- If the document is not a proof of address, return all fields as empty strings.
`;
