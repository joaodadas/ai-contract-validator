import { BASE_PROMPT } from "@/ai/_base/basePrompt";

export const FLUXO_PROMPT = `${BASE_PROMPT}

DOCUMENT_TYPE: Fluxo (Fluxo de Pagamento / Payment Flow)

SCHEMA:
{
  "document_type": "Fluxo",
  "schema_version": "2.0",
  "output": {
    "dados_cadastrais": {
      "empreendimento": "string",
      "unidade": "string",
      "bloco": "string",
      "nome_titular": "string",
      "cpf_titular": "string (11 digits only)",
      "score": 0
    },
    "financeiro": {
      "valor_venda_total": 0,
      "sinal_ato": 0,
      "financiamento_bancario": 0,
      "subsidio": 0,
      "subsidio_outros": 0,
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
        "data_vencimento": "YYYY-MM-DD"
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
      ]
    }
  }
}

SPECIFIC RULES:
- Extract the complete payment flow from the document.
- dados_cadastrais: Extract the buyer/enterprise info found at the top of the Fluxo document.
- score: Extract the credit score if present. If not found, return 0.
- CPF must be 11 digits only, no dots or dashes.

FINANCIAL EXTRACTION RULES:
- valor_venda_total: The total sale value of the property.
- sinal_ato: The initial payment (sinal/ato/entrada).
- financiamento_bancario: The bank financing amount.
- subsidio: Government subsidy (FGTS, MCMV, etc.). If not found, return 0.
- subsidio_outros: Any other subsidies. If not found, return 0.

PARCELAS MENSAIS:
- Group monthly installments by their group name (e.g. "Mensais 1", "Mensais 2").
- For each group: extract the group name, number of installments, value per installment, total group value, first and last payment dates.
- valor_total_grupo = qtd_parcelas * valor_parcela
- The Fluxo typically SKIPS December for monthly installments (December is a Reforço).

REFORÇOS ANUAIS:
- Extract each annual reinforcement payment (reforço) with its description, value, and due date.
- December payments are typically reforços, not monthly installments.

CHAVES (Keys/Delivery):
- The "chaves" payment is the delivery/handover payment.
- Extract the value and due date.

PÓS-CHAVES:
- Post-delivery installments, grouped similarly to parcelas_mensais.

- All monetary values must be numbers with dot decimal (e.g. 1250.00).
- All dates must be in YYYY-MM-DD format.
- If a section is not present in the document, return 0 for values and empty arrays for lists.
`;
