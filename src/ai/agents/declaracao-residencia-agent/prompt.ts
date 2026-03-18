import { BASE_PROMPT } from "@/ai/_base/basePrompt";

export const DECLARACAO_RESIDENCIA_PROMPT = `${BASE_PROMPT}

DOCUMENT_TYPE: Declaração de Residência (Residence Declaration)

SCHEMA:
{
  "document_type": "DeclaracaoResidencia",
  "schema_version": "1.0",
  "output": {
    "nome_morador_declarado": "string",
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
- Extract address and person information from a residence declaration.
- nome_morador_declarado: The name of the person declared as living at the address. This may be different from the document signer.
- nome_titular: The name of the person who signed/owns the declaration.
- logradouro: Street name WITHOUT the number.
- numero: House/building number only.
- complemento: Apartment, block, floor info if present. If not found, return "".
- bairro: Neighborhood name.
- cidade: City name.
- estado: State name or abbreviation.
- cep: ZIP code, digits only (8 digits). If not found, return "".
- If the document is not a residence declaration, return all fields as empty strings.
`;
