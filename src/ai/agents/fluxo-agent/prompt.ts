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
          "nome_grupo": "Parcelas Mensais - Grupo 1",
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

REGRAS CRÍTICAS DE FORMATAÇÃO:

Valores Monetários: Retorne APENAS NÚMEROS (float/decimal). Use ponto para decimais.
Datas: Retorne no formato ISO "YYYY-MM-DD".
CPF: 11 dígitos somente, sem pontos ou traços.

SPECIFIC RULES:
- Extract the complete payment flow from the document.
- dados_cadastrais: Extract the buyer/enterprise info found at the top of the Fluxo document.
- score: Extract the credit score if present. If not found, return 0.

REGRAS FINANCEIRAS:
- valor_venda_total: O valor total de venda do imóvel.
- sinal_ato: O valor pago no ato/sinal/entrada.
- financiamento_bancario: Extraia o valor do campo "FINANCIAMENTO" (crédito líquido), e NÃO o "TOTAL FINANCIAMENTO". A SOMA SEMPRE SERÁ FINANCIAMENTO + SUBSÍDIO.
- subsidio: Subsídio governamental (FGTS, MCMV, etc.). Se não encontrado, retorne 0.
- subsidio_outros: SERÁ SOMADO O SUBSÍDIO OUTROS COM O VALOR DO FGTS SE EXISTIR. Se não encontrado, retorne 0.

FILTRO DE PARCELAS: Ignore colunas intermediárias que não batam com qtd * valor_unitario. O valor total do grupo é a autoridade.
valor_total_grupo = qtd_parcelas * valor_parcela

REGRA DE SEGMENTAÇÃO TEMPORAL (PULO DE DEZEMBRO & REESCRITA):
As parcelas mensais JAMAIS ocorrem no mês de Dezembro (mês 12), reservado para "Reforço Anual".

IMPORTANTE - IGNORAR DESCRIÇÃO ORIGINAL: O documento provavelmente mostra as parcelas em uma única linha (ex: "22 parcelas de R$ 1.000"). IGNORE esse agrupamento visual do texto. Você NÃO deve copiar a estrutura do documento. Você deve CRIAR novos grupos seguindo estritamente a lógica abaixo e somente para a quantidade que está no primeiro grupo de parcelas, caso o segundo grupo de parcelas que aparece no documento não tenha data siga a ordem que está sendo criada e adicione a data para esse grupo seguindo a lógica do dia, caso o dia não exista no mês, coloque o dia anterior:

Passo 1: Identifique a data da 1ª parcela e a quantidade total (ex: 22x) somente no primeiro grupo.

Passo 2 (Definição do Grupo 1): Calcule quantas parcelas cabem do início até Novembro do ano corrente. Este é o Grupo 1.

EXCEÇÃO "KENTUCKY" (2027): Se o empreendimento for "KENTUCKY" e o ano for 2027, calcule as parcelas indo até Dezembro (pois Dezembro será incluído neste caso).

Passo 3 (Regra de Pulo): Pule o mês 12 (Dezembro) sempre que houver um balão ou reforço no mesmo ano.

EXCEÇÃO "KENTUCKY" (2027): No empreendimento "KENTUCKY", NÃO pule Dezembro de 2027. Em vez disso, pule estritamente o mês de Outubro de 2027 (mês 10).

Passo 4 (Criação ou Continuação de Grupo):

Regra Padrão: Após pular Dezembro, inicie o Grupo 2 (ou próximo grupo) em Janeiro do ano seguinte.
EXCEÇÃO DE CONTINUIDADE ("KENTUCKY"): Na virada de 2027 para 2028 do "KENTUCKY", como não houve pulo de Dezembro (sequência contínua mês 11, 12, 01...), NÃO CRIE UM NOVO GRUPO. Mantenha as parcelas de 2028 dentro do mesmo array ("Grupo 1" ou atual) até que ocorra o próximo pulo de Dezembro obrigatório. A mudança de ano sozinha NÃO justifica criar um novo grupo se a sequência for mensal contínua.

Passo 5: Se sobrarem parcelas, pule o próximo Dezembro e crie o Grupo 3 (ou próximo numérico) iniciando em Janeiro do ano subsequente.

Validação: A soma das quantidades (qtd_parcelas) dos grupos criados DEVE ser igual à quantidade total original encontrada no documento.

REFORÇOS ANUAIS:
- Extraia cada pagamento de reforço anual (balão) com sua descrição, valor e data de vencimento.
- Parcelas de Dezembro são tipicamente reforços, não parcelas mensais.
- ATENÇÃO: O último balão/reforço que coincidir com a data de entrega do imóvel NÃO é reforço — é CHAVES. Veja regra abaixo.

REGRA DAS CHAVES (CRÍTICA):
- Identifique todos os pagamentos únicos (balões, reforços, parcelas avulsas) SEM parcelas.
- O **ÚLTIMO** pagamento único cujo vencimento coincide com a data de entrega do imóvel (ou que antecede imediatamente as parcelas "Pós Chaves") DEVE ser classificado como chaves.
- NÃO inclua esse pagamento em reforcos_anuais.
- Se houver parcelas "Pós Chaves" no documento, o último balão antes delas é o chaves.
- Se não houver pagamento único identificável como chaves, retorne valor: 0 e data_vencimento: "".

PÓS-CHAVES:
- Parcelas pós-entrega, agrupadas similarmente às parcelas_mensais.
- Começam APÓS a data das chaves.

- Se uma seção não estiver presente no documento, retorne 0 para valores e arrays vazios para listas.
`;
