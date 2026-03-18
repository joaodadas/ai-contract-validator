import { BASE_PROMPT } from "@/ai/_base/basePrompt";

export const QUADRO_RESUMO_PROMPT = `${BASE_PROMPT}

DOCUMENT_TYPE: Quadro Resumo (Summary Table / Contract Summary)

SCHEMA:
{
  "document_type": "QuadroResumo",
  "schema_version": "2.0",
  "output": {
    "imovel": {
      "empreendimento": "string",
      "unidade": "string",
      "bloco": "string"
    },
    "compradores": [
      {
        "nome": "string",
        "cpf": "string (11 digits only)",
        "tipo": "string (titular/conjuge/comprador/fiador)",
        "renda": 0,
        "ocupacao": "string",
        "estado_civil": "string"
      }
    ],
    "financeiro": {
      "valor_venda_total": 0,
      "sinal_ato": 0,
      "financiamento_bancario": 0,
      "subsidio_total": 0,
      "parcelas_mensais": [
        {
          "nome_grupo": "string",
          "qtd_parcelas": 0,
          "valor_parcela": 0,
          "valor_total_grupo": 0,
          "data_inicio": "YYYY-MM-DD",
          "data_fim": "YYYY-MM-DD"
        }
      ],
      "reforcos_anuais": [
        {
          "descricao": "string",
          "valor": 0,
          "data_vencimento": "YYYY-MM-DD"
        }
      ],
      "chaves": {
        "valor": 0,
        "vencimento": "YYYY-MM-DD"
      },
      "pos_chaves": [
        {
          "nome_grupo": "string",
          "qtd_parcelas": 0,
          "valor_parcela": 0,
          "valor_total_grupo": 0,
          "data_inicio": "YYYY-MM-DD",
          "data_fim": "YYYY-MM-DD"
        }
      ],
      "data_entrega_imovel": "YYYY-MM-DD"
    }
  }
}

SPECIFIC RULES:
- Extract the complete contract summary from the Quadro Resumo document.

IMOVEL:
- empreendimento: The name of the real estate development.
- unidade: The unit/apartment number.
- bloco: The block/tower identifier.

COMPRADORES:
- List ALL buyers/people mentioned in the Quadro Resumo.
- tipo: "titular" for the main buyer, "conjuge" for spouse, "comprador" for additional buyers, "fiador" for guarantors.
- CPF must be 11 digits only, no dots or dashes.
- renda: Monthly income as a number. If not found, return 0.
- ocupacao: Job/occupation. If not found, return "".
- estado_civil: solteiro, casado, divorciado, viuvo, separado, uniao estavel — lowercase.

FINANCEIRO:
- valor_venda_total: Total sale price of the property.
- sinal_ato: Initial payment / down payment (Ato / Sinal / Entrada).
- financiamento_bancario: Bank financing amount.
- subsidio_total: Total subsidies (FGTS, government programs, etc.).

PARCELAS MENSAIS:
- Group monthly installments by their group name.
- For each group: extract group name, number of installments, value per installment, total group value, first and last payment dates.

REFORÇOS ANUAIS:
- Each annual reinforcement payment with description, value, and due date.

CHAVES:
- The delivery/handover payment value and due date.

PÓS-CHAVES:
- Post-delivery installments grouped similarly to parcelas_mensais.

DATA_ENTREGA_IMOVEL:
- The expected property delivery date. If not found, return "".

- All monetary values must be numbers with dot decimal (e.g. 150000.00).
- All dates must be in YYYY-MM-DD format.
- If a value is not found, return 0 for numbers and "" for strings.
`;
