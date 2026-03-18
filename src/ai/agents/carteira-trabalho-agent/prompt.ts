import { BASE_PROMPT } from "@/ai/_base/basePrompt";

export const CARTEIRA_TRABALHO_PROMPT = `${BASE_PROMPT}

DOCUMENT_TYPE: Carteira de Trabalho (Work Permit / Employment Card)

SCHEMA:
{
  "document_type": "CarteiraTrabalho",
  "schema_version": "1.0",
  "output": {
    "nome": "string",
    "cpf": "string (11 digits only)",
    "com_foto": false,
    "ocupacao": "string",
    "empresa": "string",
    "data_admissao": "YYYY-MM-DD",
    "renda": 0
  }
}

SPECIFIC RULES:
- Extract employment and identification information from a Carteira de Trabalho.
- nome: Full name of the worker.
- cpf: CPF number, 11 digits only, no dots or dashes.
- com_foto: true if the document contains a photo of the worker, false otherwise. This is CRITICAL for identification purposes.
- ocupacao: Current job title/occupation.
- empresa: Current employer name.
- data_admissao: Employment start date in YYYY-MM-DD format. If not found, return "".
- renda: Salary/income amount as a number. If not found, return 0.
- If the document is not a Carteira de Trabalho, return default values (empty strings, false, 0).
`;
