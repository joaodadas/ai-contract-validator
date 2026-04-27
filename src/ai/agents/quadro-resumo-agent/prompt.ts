import { BASE_PROMPT } from "@/ai/_base/basePrompt";

export const QUADRO_RESUMO_PROMPT = `${BASE_PROMPT}

DOCUMENT_TYPE: Quadro Resumo (Summary Table / Contract Summary)

Analise o documento "Quadro Resumo" (especialmente os itens C, D, H, I e M) e extraia os dados retornando um único objeto JSON.

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
        "estado_civil": "string",
        "endereco": "string",
        "bairro": "string",
        "cidade": "string",
        "estado": "string",
        "cep": "string",
        "telefone": "string",
        "rg": "string",
        "nacionalidade": "string"
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

REGRAS CRÍTICAS DE FORMATAÇÃO E LÓGICA:
1. **Valores Monetários:** Retorne APENAS NÚMEROS (float/decimal). Use ponto para decimais. Exemplo: Converta "R$ 1.250,00" para 1250.00. Não use strings.
2. **Datas:** Retorne no formato ISO "YYYY-MM-DD".
3. **Cálculos:** Se o texto disser "11 parcelas de R$ 500,00", você deve extrair a quantidade (11), o unitário (500.00) e calcular o total (5500.00). valor_total_grupo = qtd_parcelas * valor_parcela.
4. **Regra de Pós-Chaves:** Analise a sequência de grupos de parcelas mensais. Se o **último grupo** de parcelas listado tiver uma quantidade (**qtd_parcelas**) **maior que 13**, este grupo específico deve ser inserido obrigatoriamente no array pos_chaves, e NÃO no array parcelas_mensais.
5. **Regra das Chaves (Reforço Final):** Identifique todos os pagamentos listados com pagamentos únicos, **SEM PARCELAS** abaixo de 1.000. O **ÚLTIMO** item dessa lista (COM VENCIMENTO IGUAL A DATA DE ENTREGA) deve ser OBRIGATORIAMENTE movido para o campo chaves. Não o inclua na lista de reforcos_anuais.
6. **Regra de Subsídios/Programas Sociais:** Verifique minuciosamente o Item H. Qualquer valor listado como proveniente de **programas sociais ou habitacionais ou FGTS** (Exemplos: "Casa Fácil", "COHAPAR", "Minha Casa Minha Vida", "Subsídio Porta de Entrada", "Cheque Moradia") DEVE ser classificado e somado no campo subsidio_total. **NÃO** inclua esses valores como parcelas, reforços ou chaves.
7. **Endereço:** Caso se repita como "Rua Rua das coves" ou "Av Av das coves", remover a duplicidade deixando somente ex.: "Rua das coves".

IMOVEL:
- empreendimento: O nome do empreendimento imobiliário.
- unidade: O número do apartamento/unidade.
- bloco: O identificador do bloco/torre.

COMPRADORES:
- Liste TODOS os compradores/pessoas mencionados no Quadro Resumo.
- tipo: "titular" para o comprador principal, "conjuge" para cônjuge, "comprador" para compradores adicionais, "fiador" para fiadores.
- CPF: 11 dígitos somente, sem pontos ou traços.
- renda: Renda mensal como número. Se não encontrada, retorne 0.
- ocupacao: Profissão/ocupação. Se não encontrada, retorne "".
- estado_civil: solteiro, casado, divorciado, viuvo, separado, uniao estavel — minúsculo.
- endereco, bairro, cidade, estado, cep, telefone, rg, nacionalidade: Extraia se disponível, "" se não.

FINANCEIRO:
- valor_venda_total: Valor total de venda do imóvel (Item G ou E).
- sinal_ato: Valor pago no ato/sinal/entrada.
- financiamento_bancario: Valor exato do financiamento (Item I).
- subsidio_total: Soma de todos os subsídios (incluindo Casa Fácil/COHAPAR do item H) e/ou valor através de conta vinculada FGTS.
- EXCEÇÃO RENO / JERSEY: Nesses empreendimentos, aplique a seguinte regra: não existem parcelas (pós-chaves, balão ou parcela de chaves), todas são consideradas grupo de parcela mensal ate mesmo parcelas unicas, junte todas no mesmo grupo.

PARCELAS MENSAIS:
- Liste as séries de parcelas normais com nome do grupo, quantidade, valor unitário, valor total e datas.

REFORÇOS ANUAIS:
- Liste as parcelas de pagamento único, balão/reforço, EXCETO subsídios e **CHAVES SE COINCIDIR COM DATA DE ENTREGA**.

CHAVES:
- Valor da ÚLTIMA parcela única "anual/balão" se coincidir com data de entrega.

PÓS-CHAVES:
- Inserir aqui se cair na Regra 4 (> 13 parcelas no fim).

DATA_ENTREGA_IMOVEL:
- A data de entrega esperada do imóvel (Cláusula M). Se não encontrada, retorne "".

- Se um valor não for encontrado, retorne 0 para números e "" para strings.
`;
