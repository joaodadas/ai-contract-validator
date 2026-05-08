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
          "parcela_tipo_X": "Parcela tipo X",
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
          "pos_chaves": "string",
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
- IGNORE O CAMPO TOTAL N° DE PARC QUE APARECE ANTES DOS GRUPOS DE PARCELAS.
- GRUPO DE PÓS-CHAVES NÃO SE JUNTA COM AS PARCELAS MENSAIS MESMO SE TODAS AS PARCELAS FOREM PÓS ENTREGA.
- valor_venda_total: O valor total de venda do imóvel.
- sinal_ato: O valor pago no ato/sinal/entrada.
- financiamento_bancario: Extraia o valor do campo "FINANCIAMENTO" (crédito líquido), e NÃO o "TOTAL FINANCIAMENTO". A SOMA SEMPRE SERÁ FINANCIAMENTO + SUBSÍDIO.
- subsidio: Subsídio governamental (FGTS, MCMV, etc.). Se não encontrado, retorne 0.
- subsidio_outros: Soma do subsidio com o valor do FGTS, se existir. Se não encontrado, retorne 0.
- financiamento_total: Valor de "TOTAL FINANCIAMENTO" do documento (financiamento_bancario + subsidio). Se não existir, retorne 0.

### EXCEÇÃO CASO SEJA JERSEY CITY OU RENO:
Neste empreendimento específico ("JERSEY CITY" ou "RENO"), aplique duas regras exclusivas:
  1. **Parcelas 'Pós-Chaves' viram 'Parcelas Mensais'**: Mova-as para o array 'parcelas_mensais' e deixe 'pos_chaves' vazio.
  2. **NÃO faça a divisão de parcelas**: Ignore a regra de pulo de Dezembro e de criação de múltiplos grupos. Mantenha todas as parcelas mensais (incluindo as que eram pós-chaves) consolidadas em um único "Grupo 1".

### REGRA PARA JERSEY VILLAGE:
Para o empreendimento "JERSEY VILLAGE", as regras padrão se aplicam rigorosamente:
  1. **Mantenha a distinção MENSAL vs PÓS-CHAVES**: As parcelas de pós-chaves devem ficar obrigatoriamente no campo 'pos_chaves'.
  2. **Siga a divisão de parcelas**: Aplique o pulo de Dezembro e crie novos grupos normalmente conforme as REGRAS DE AGRUPAMENTO (passo a passo de pular Dezembro e mudar de grupo).

FILTRO DE PARCELAS: Ignore colunas intermediárias que não batam com qtd * valor_unitario. O valor total do grupo é a autoridade.

REGRA DE SEGMENTAÇÃO TEMPORAL (PULO DE DEZEMBRO & REESCRITA):
As parcelas mensais JAMAIS ocorrem no mês de Dezembro (mês 12), reservado para "Reforço Anual".

1. PRESERVAÇÃO DE GRUPOS: Extraia os grupos de parcelas exatamente como aparecem na tabela. Não consolide grupos  
  distintos (ex: se houver 3 linhas de mensais com prazos diferentes, extraia 3 objetos de acordo com regra de separação de parcelas mensais).
2. DISTINÇÃO MENSAL VS PÓS-CHAVES: Analise a cronologia. Se um bloco de parcelas (ex: 36 parcelas) se inicia após 
  o término dos grupos iniciais e coincide com o período pós-obra/entrega, extraia-o no campo 'pos_chaves'.

IMPORTANTE - REGRAS DE AGRUPAMENTO E SEPARAÇÃO DE PARCELAS:
1. MUDANÇA DE VALOR (CRÍTICO): JAMAIS, NUNCA agrupe parcelas que possuam valores diferentes. Se o documento listar parcelas com valores distintos (ex: 22x de R$ 640,01 e depois 3x de R$ 500,00), elas DEVEM OBRIGATORIAMENTE ser separadas em objetos/grupos diferentes no array "parcelas_mensais". O cálculo de "valor_total_grupo" deve ser exato para aquele valor de parcela.
2. REESTRUTURAÇÃO POR PULO DE MÊS: Para parcelas de mesmo valor, você deve fragmentar a sequência e CRIAR novos grupos sempre que a regra de pular o mês de Dezembro for ativada.
3. DATAS AUSENTES: Caso um grupo de parcelas não tenha data de início explícita, calcule-a continuando a sequência mensal exata de onde o grupo anterior terminou (lembrando de pular Dezembro, se for o caso). Ajuste o dia se o mês não tiver o dia correspondente.


Passo 1: Identifique todos os blocos de parcelas no documento. Separe-os imediatamente em novos grupos se o "valor_parcela" mudar. Para cada bloco, aplique as regras de fragmentação abaixo.

Passo 2 (Definição do Grupo 1): Calcule quantas parcelas cabem do início até Novembro do ano corrente. Este é o Grupo 1.

EXCEÇÃO "KENTUCKY" (2027): Se o empreendimento for "KENTUCKY" e o ano for 2027, calcule as parcelas indo até Dezembro (pois Dezembro será incluído neste caso).

Passo 3 (Regra de Pulo): Pule o mês 12 (Dezembro) sempre que houver um balão ou reforço no mesmo ano.

EXCEÇÃO "KENTUCKY" (2027): No empreendimento "KENTUCKY", NÃO pule Dezembro de 2027. Em vez disso, pule estritamente o mês de Outubro de 2027 (mês 10).

Passo 4 (Criação ou Continuação de Grupo):

Regra Padrão: Após pular Dezembro, inicie o Grupo 2 (ou próximo grupo) inicie em Janeiro do ano seguinte.
EXCEÇÃO DE CONTINUIDADE ("KENTUCKY"): Na virada de 2027 para 2028 do "KENTUCKY", como não houve pulo de Dezembro (sequência contínua mês 11, 12, 01...), NÃO CRIE UM NOVO GRUPO. Mantenha as parcelas de 2028 dentro do mesmo array ("Grupo 1" ou atual) até que ocorra o próximo pulo de Dezembro obrigatório. A mudança de ano sozinha NÃO justifica criar um novo grupo se a sequência for mensal contínua.

Passo 5: Se sobrarem parcelas, pule o próximo Dezembro e crie o Grupo 3 (ou próximo numérico) iniciando em Janeiro do ano subsequente.

Validação: A soma das quantidades (qtd_parcelas) dos grupos criados DEVE ser igual à quantidade total original encontrada no documento.

Regra para balão: TODOS OS BALÕES TERÃO DATA DE VENCIMENTO EM DEZEMBRO. NÃO OBRIGATORIO PARA CHAVES.

- Se uma seção não estiver presente no documento, retorne 0 para valores e arrays vazios para listas.

EXAMPLES (FEW-SHOT):
Fluxo
EMPREENDIMENTO
KENTUCKY FASE II - CONDOMINIO RESIDENCIAL
BLOCO 27
UNID. 406
FASE 2
REGIÃO CWB
F.L
ZIMMER
M.F.R
M.F.L
P.V
PLATAFORMA (ZIMMER)
REALCE
NORTE
NOME, CPF, TIPO, SCORE, TELEFONE
PIETRA RODRIGUES RAMOS, 10976398940, COMPRADOR, 676, 41992752789
RENDA APROVADA
30%
RENDA BRUTA
R$ 5.663,15
TIPO RENDA LYX
"Formal"
RENDA UTILI, CEF
R$ 5.663,15
VALOR AVALIAÇÃO
R$ 230.000
TIPO RENDA CEF DESCONTO
"Formal"
R$ 5.000
FORMA RENDA LYX FORMA RENDA CEF DOCUMENTAÇÃO LYX
0
0
R$ 12.800
VALOR TABELA
R$ 225.000
PARCELA CAIXA
R$ 1.698,95
R$ 1.189,26
R$ 1.359,16
R$ 1.019,37
VALOR PROPOSTA
R$ 237.800
ENTRADA
R$ 500
0,21%
% LYX
14,00%
% PÓS
4,20%
TOTAL N° DE PARC
56
VALOR MENSAL
TOTAL
PARCELAS TIPO 1
7
11/06/2026
R$ 985,86
R$ 17.301
R$ 6.901
2,90%
PARCELAS TIPO 2
7
R$ 842,86
R$ 5.900
2.48%
PARCELAS TIPO 3
6
R$ 750
R$ 4.500
1,89%
POS CHAVES
36
R$ 277,75
R$ 9.999
1,89%
REFORÇO ANUAL 1
20/12/2026
R$ 3.000
1,26%
% DA RENDA
CHAVES
R$ 3.000
1.26%
20%
R$ 1.132,63
R$ 7.928,41
15%
R$ 849,47
R$ 5.946,31
70%
R$ 3.964,20
FINANCIAMENTO
VALOR VENDA
R$ 184.000,00 R$ 237.800,00
FGTS
R$ 0
SUBSIDIO
R$ 0,00
SUBSIDIO OUTROS
R$20.000,00
% TOTAL VENDA 100,0%
TOTAL FINANCIAMENTO R$ 204.000,00

EXPECTED OUTPUT JSON:
{
  "document_type": "Fluxo",
  "schema_version": "3.0",
  "output": {
    "dados_cadastrais": {
      "empreendimento": "KENTUCKY FASE II - CONDOMINIO RESIDENCIAL",
      "unidade": "406",
      "bloco": "27",
      "titulares": [
        {
          "nome": "PIETRA RODRIGUES RAMOS",
          "cpf": "10976398940",
          "score": 676
        }
      ]
    },
    "financeiro": {
      "valor_venda_total": 237800.00,
      "sinal_ato": 500.00,
      "financiamento_bancario": 184000.00,
      "subsidio": 0.00,
      "subsidio_outros": 20000.00,
      "financiamento_total": 204000.00,
      "parcelas_mensais": [
        {
          "parcela_tipo_X": "Parcelas Mensais - Grupo 1",
          "qtd_parcelas": 6,
          "valor_parcela": 985.86,
          "valor_total_grupo": 5915.16,
          "data_inicio": "2026-06-11",
          "data_fim": "2026-11-11"
        },
        {
          "parcela_tipo_X": "Parcelas Mensais - Grupo 2",
          "qtd_parcelas": 1,
          "valor_parcela": 985.86,
          "valor_total_grupo": 985.86,
          "data_inicio": "2027-01-11",
          "data_fim": "2027-01-11"
        },
        {
          "parcela_tipo_X": "Parcelas Mensais - Grupo 3",
          "qtd_parcelas": 7,
          "valor_parcela": 842.86,
          "valor_total_grupo": 5900.02,
          "data_inicio": "2027-02-11",
          "data_fim": "2027-08-11"
        },
        {
          "parcela_tipo_X": "Parcelas Mensais - Grupo 4",
          "qtd_parcelas": 1,
          "valor_parcela": 750.00,
          "valor_total_grupo": 750.00,
          "data_inicio": "2027-09-11",
          "data_fim": "2027-09-11"
        },
        {
          "parcela_tipo_X": "Parcelas Mensais - Grupo 5",
          "qtd_parcelas": 5,
          "valor_parcela": 750.00,
          "valor_total_grupo": 3750.00,
          "data_inicio": "2027-11-11",
          "data_fim": "2028-03-11"
        }
      ],
      "reforcos_anuais": [
        {
          "descricao": "REFORÇO ANUAL 1",
          "valor": 3000.00,
          "data_vencimento": "2026-12-20"
        }
      ],
      "chaves": {
        "valor": 3000.00,
        "data_vencimento": ""
      },
      "pos_chaves": [
        {
          "pos_chaves": "Pós Chaves - Grupo 1",
          "qtd_parcelas": 36,
          "valor_parcela": 277.75,
          "valor_total_grupo": 9999.00,
          "data_inicio": "2028-04-11",
          "data_fim": "2031-03-11"
        }
      ]
    }
  }
}
`;
