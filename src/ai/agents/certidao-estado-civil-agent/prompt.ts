import { BASE_PROMPT } from "@/ai/_base/basePrompt";

export const CERTIDAO_ESTADO_CIVIL_PROMPT = `${BASE_PROMPT}

DOCUMENT_TYPE: Certidão de Estado Civil / Certidão de Nascimento (Civil Status Certificate / Birth Certificate)

SCHEMA:
{
  "document_type": "CertidaoEstadoCivil",
  "schema_version": "1.0",
  "output": {
    "tipo": "string (nascimento/casamento/divorcio/obito)",
    "nome": "string",
    "nome_conjuge": "string",
    "estado_civil": "string",
    "alteracao_de_nome": false,
    "nome_anterior": "string",
    "nome_atual": "string",
    "data_nascimento": "YYYY-MM-DD",
    "filiacao1": "string (mother or first parent)",
    "filiacao2": "string (father or second parent)"
  }
}

SPECIFIC RULES:
- Extract civil status information from a birth certificate or civil status certificate.
- tipo: The type of certificate — "nascimento" for birth, "casamento" for marriage, "divorcio" for divorce, "obito" for death.
- nome: Full name of the person on the certificate.
- nome_conjuge: Spouse name if present (marriage certificate). If not found, return "".
- estado_civil: solteiro, casado, divorciado, viuvo, separado, uniao estavel — lowercase.
- alteracao_de_nome: true if there was a name change (e.g. after marriage/divorce), false otherwise.
- nome_anterior: Previous name before change. If no change, return "".
- nome_atual: Current name after change. If no change, return "".
- data_nascimento: Date of birth in YYYY-MM-DD format. If not found, return "".
- filiacao1: Mother's name (or first parent). If not found, return "".
- filiacao2: Father's name (or second parent). If not found, return "".
- If the document is not a civil status certificate or birth certificate, return all fields with default values.
`;
