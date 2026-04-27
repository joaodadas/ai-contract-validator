import { BASE_PROMPT } from "@/ai/_base/basePrompt";

export const FLUXO_PROMPT = `${BASE_PROMPT}

DOCUMENT_TYPE: Fluxo (Fluxo de Pagamento / Payment Flow)

SCHEMA:
{
  "document_type": "Fluxo",
  "schema_version": "3.0",
  "output": {
    "dados_cadastrais": {
      "empreendimento": "string",
      "unidade": "string",
      "bloco": "string",
      "titulares": [{ "nome": "string", "cpf": "string (11 digits only)", "score": 0 }]
    },
    "financeiro": {
      "valor_venda_total": 0,
      "sinal_ato": 0,
      "financiamento_bancario": 0,
      "subsidio": 0,
      "subsidio_outros": 0,
      "financiamento_total": 0,
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
- dados_cadastrais: Extraia os dados do empreendimento e de TODOS os compradores/titulares listados no documento. Retorne um array "titulares" com nome, CPF e score de cada um. Se o score não estiver presente para um comprador, retorne 0.

REGRAS FINANCEIRAS:
- valor_venda_total: O valor total de venda do imóvel.
- sinal_ato: O valor pago no ato/sinal/entrada.
- financiamento_bancario: Extraia o valor do campo "FINANCIAMENTO" (crédito líquido), e NÃO o "TOTAL FINANCIAMENTO". A SOMA SEMPRE SERÁ FINANCIAMENTO + SUBSÍDIO.
- subsidio_outros = subsidio + subsidio_outros.
- subsidio: Subsídio governamental (FGTS, MCMV, etc.). Se não encontrado, retorne 0.


FILTRO DE PARCELAS: Ignore colunas intermediárias que não batam com qtd * valor_unitario. O valor total do grupo é a autoridade.
valor_total_grupo = qtd_parcelas * valor_parcela

REGRA DE SEGMENTAÇÃO TEMPORAL (PULO DE DEZEMBRO & REESCRITA):
As parcelas mensais JAMAIS ocorrem no mês de Dezembro (mês 12), reservado para "Reforço Anual".

EXCEÇÃO RENO / JERSEY:** Nesses empreendimentos, aplique duas regras exclusivas:
  Parcelas "Pós-Chaves" viram "Parcelas Mensais". Mova-as para parcelas_mensais e deixe pos_chaves vazio.
  NÃO faça a divisão de parcelas.** Ignore a regra de pulo de Dezembro e de criação de novos grupos. Mantenha todas as parcelas mensais (incluindo as que eram pós-chaves) aglomeradas em um único "Grupo 1".

IMPORTANTE - REGRAS DE AGRUPAMENTO E SEPARAÇÃO DE PARCELAS:
1. MUDANÇA DE VALOR (CRÍTICO): JAMAIS agrupe parcelas que possuam valores diferentes. Se o documento listar parcelas com valores distintos (ex: 22x de R$ 640,01 e depois 3x de R$ 500,00), elas DEVEM OBRIGATORIAMENTE ser separadas em objetos/grupos diferentes no array "parcelas_mensais". O cálculo de "valor_total_grupo" deve ser exato para aquele valor de parcela.
2. REESTRUTURAÇÃO POR PULO DE MÊS: Para parcelas de mesmo valor, você deve fragmentar a sequência e CRIAR novos grupos sempre que a regra de pular o mês de Dezembro for ativada.
3. DATAS AUSENTES: Caso um grupo de parcelas não tenha data de início explícita, calcule-a continuando a sequência mensal exata de onde o grupo anterior terminou (lembrando de pular Dezembro, se for o caso). Ajuste o dia se o mês não tiver o dia correspondente.

Passo 1: Identifique todos os blocos de parcelas no documento. Separe-os imediatamente em novos grupos se o "valor_parcela" mudar. Para cada bloco, aplique as regras de fragmentação abaixo.

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
