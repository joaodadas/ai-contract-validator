import { BASE_PROMPT } from "@/ai/_base/basePrompt";

export const COMPROVANTE_RENDA_PROMPT = `${BASE_PROMPT}

DOCUMENT_TYPE: Comprovante de Renda (Income Proof / Holerite / Pay Stub)

SCHEMA:
{
  "document_type": "ComprovanteRenda",
  "schema_version": "1.0",
  "output": {
    "nome": "string",
    "cpf": "string (11 digits only)",
    "valor_renda": 0,
    "tipo": "string (holerite/extrato/declaracao/cartao_credito)",
    "empresa": "string",
    "data_referencia": "YYYY-MM-DD"
  }
}

SPECIFIC RULES:
- Extract income/salary information from a proof of income document.
- This includes: Holerite, Contracheque, Extrato Bancário, Declaração de Renda, Cartão de Crédito (fatura).
- nome: Full name of the person.
- cpf: CPF number, 11 digits only.
- valor_renda: The income/salary amount as a number with dot decimal. For holerite, use the net salary (salário líquido). For credit cards, use the credit limit or total spending.
- tipo: "holerite" for pay stubs, "extrato" for bank statements, "declaracao" for income declarations, "cartao_credito" for credit card statements.
- empresa: Employer or issuing institution name.
- data_referencia: Reference period date in YYYY-MM-DD format.
- If the document is not an income proof, return default values.
`;
