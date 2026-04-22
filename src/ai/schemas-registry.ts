import type { DynamicFieldDefinition } from "./_base/dynamic-types";
import type { AgentName } from "./_base/types";

export const DEFAULT_SCHEMAS: Partial<Record<AgentName, DynamicFieldDefinition[]>> = {
  "cnh-agent": [
    { name: "nome", type: "string", description: "Nome completo do titular" },
    { name: "rg_ou_identidade", type: "string", description: "Número do RG ou Identidade" },
    { name: "cpf", type: "string", description: "CPF do titular (apenas números)" },
    { name: "data_nascimento", type: "string", description: "Data de nascimento (AAAA-MM-DD)" },
    { name: "filiacao1", type: "string", description: "Nome da mãe ou primeiro genitor" },
    { name: "filiacao2", type: "string", description: "Nome do pai ou segundo genitor" },
  ],
  "rgcpf-agent": [
    { name: "nome", type: "string", description: "Nome completo" },
    { name: "rg", type: "string", description: "Número do RG" },
    { name: "cpf", type: "string", description: "Número do CPF" },
    { name: "data_nascimento", type: "string", description: "Data de nascimento (AAAA-MM-DD)" },
    { name: "estado_civil", type: "string", description: "Estado civil por extenso" },
    { name: "filiacao1", type: "string", description: "Primeira filiação (mãe)" },
    { name: "filiacao2", type: "string", description: "Segunda filiação (pai)" },
  ],
  "fluxo-agent": [
    {
      name: "dados_cadastrais",
      type: "object",
      description: "Dados do empreendimento e titulares",
      fields: [
        { name: "empreendimento", type: "string" },
        { name: "unidade", type: "string" },
        { name: "bloco", type: "string" },
        {
          name: "titulares",
          type: "array",
          items: {
            name: "titular",
            type: "object",
            fields: [
              { name: "nome", type: "string" },
              { name: "cpf", type: "string" },
              { name: "score", type: "number" },
            ]
          }
        }
      ]
    },
    {
      name: "financeiro",
      type: "object",
      description: "Dados financeiros da proposta",
      fields: [
        { name: "valor_venda_total", type: "number" },
        { name: "sinal_ato", type: "number" },
        { name: "financiamento_bancario", type: "number" },
        { name: "subsidio", type: "number" },
        { name: "subsidio_outros", type: "number" },
        { 
          name: "parcelas_mensais", 
          type: "array",
          items: {
            name: "parcela",
            type: "object",
            fields: [
              { name: "nome_grupo", type: "string" },
              { name: "qtd_parcelas", type: "number" },
              { name: "valor_parcela", type: "number" },
              { name: "valor_total_grupo", type: "number" },
              { name: "data_inicio", type: "string" },
              { name: "data_fim", type: "string" },
            ]
          }
        },
        {
          name: "reforcos_anuais",
          type: "array",
          items: {
            name: "reforco",
            type: "object",
            fields: [
              { name: "descricao", type: "string" },
              { name: "valor", type: "number" },
              { name: "data_vencimento", type: "string" },
            ]
          }
        },
        {
          name: "chaves",
          type: "object",
          fields: [
            { name: "valor", type: "number" },
            { name: "data_vencimento", type: "string" },
          ]
        },
        {
          name: "pos_chaves",
          type: "array",
          items: {
            name: "parcela",
            type: "object",
            fields: [
              { name: "nome_grupo", type: "string" },
              { name: "qtd_parcelas", type: "number" },
              { name: "valor_parcela", type: "number" },
              { name: "valor_total_grupo", type: "number" },
              { name: "data_inicio", type: "string" },
              { name: "data_fim", type: "string" },
            ]
          }
        }
      ]
    }
  ],
  "quadro-resumo-agent": [
    {
      name: "imovel",
      type: "object",
      fields: [
        { name: "empreendimento", type: "string" },
        { name: "bloco", type: "string" },
        { name: "unidade", type: "string" },
      ]
    },
    {
      name: "financeiro",
      type: "object",
      fields: [
        { name: "valor_venda", type: "number" },
        { name: "data_entrega_imovel", type: "string" },
      ]
    },
    {
      name: "compradores",
      type: "array",
      items: {
        name: "comprador",
        type: "object",
        fields: [
          { name: "nome", type: "string" },
          { name: "cpf", type: "string" },
        ]
      }
    }
  ],
  "termo-agent": [
    { name: "assinado", type: "boolean" },
    { name: "nome_assinante", type: "string" },
    { name: "data_assinatura", type: "string" },
    { name: "tipo_assinatura", type: "string" },
  ],
  "ato-agent": [
    { name: "valor_total", type: "number" },
    { name: "data_pagamento", type: "string" },
  ],
  "carta-fiador-agent": [
    { name: "assinada", type: "boolean" },
    { name: "nome_fiador", type: "string" },
    { name: "cpf_fiador", type: "string" },
    { name: "data_assinatura", type: "string" },
  ],
  "carteira-trabalho-agent": [
    { name: "nome", type: "string" },
    { name: "cpf", type: "string" },
    { name: "com_foto", type: "boolean" },
    { name: "ocupacao", type: "string" },
    { name: "empresa", type: "string" },
    { name: "data_admissao", type: "string" },
    { name: "renda", type: "number" },
  ],
  "certidao-estado-civil-agent": [
    { name: "tipo", type: "string" },
    { name: "nome", type: "string" },
    { name: "nome_conjuge", type: "string" },
    { name: "estado_civil", type: "string" },
    { name: "alteracao_de_nome", type: "boolean" },
    { name: "nome_anterior", type: "string" },
    { name: "nome_atual", type: "string" },
    { name: "data_nascimento", type: "string" },
    { name: "filiacao1", type: "string" },
    { name: "filiacao2", type: "string" },
  ],
  "comprovante-renda-agent": [
    { name: "nome", type: "string" },
    { name: "cpf", type: "string" },
    { name: "valor_renda", type: "number" },
    { name: "tipo", type: "string" },
    { name: "empresa", type: "string" },
    { name: "data_referencia", type: "string" },
  ],
  "comprovante-residencia-agent": [
    { name: "nome_titular", type: "string" },
    { name: "logradouro", type: "string" },
    { name: "numero", type: "string" },
    { name: "complemento", type: "string" },
    { name: "bairro", type: "string" },
    { name: "cidade", type: "string" },
    { name: "estado", type: "string" },
    { name: "cep", type: "string" },
  ],
  "declaracao-residencia-agent": [
    { name: "nome_morador_declarado", type: "string" },
    { name: "nome_titular", type: "string" },
    { name: "logradouro", type: "string" },
    { name: "numero", type: "string" },
    { name: "complemento", type: "string" },
    { name: "bairro", type: "string" },
    { name: "cidade", type: "string" },
    { name: "estado", type: "string" },
    { name: "cep", type: "string" },
  ],
  "planta-agent": [
    {
      name: "unidades",
      type: "array",
      items: {
        name: "unidade",
        type: "object",
        fields: [
          { name: "bloco", type: "string" },
          { name: "apto", type: "string" },
          { name: "quartos", type: "number" },
          { name: "banheiros", type: "number" },
          { name: "vagas", type: "number" },
          { name: "area_privativa_m2", type: "number" },
        ]
      }
    }
  ],
  "validation-agent": [
    {
      name: "dados_imovel",
      type: "object",
      fields: [
        { name: "nome_empreendimento", type: "object", fields: [{ name: "status", type: "string" }, { name: "detalhes", type: "string" }] },
        { name: "unidade_bloco", type: "object", fields: [{ name: "status", type: "string" }, { name: "detalhes", type: "string" }] },
      ]
    },
    {
      name: "financeiro",
      type: "object",
      fields: [
        { name: "valor_venda_total", type: "object", fields: [{ name: "status", type: "string" }, { name: "detalhes", type: "string" }] },
        { name: "financiamento", type: "object", fields: [{ name: "status", type: "string" }, { name: "detalhes", type: "string" }] },
        { name: "subsidio", type: "object", fields: [{ name: "status", type: "string" }, { name: "detalhes", type: "string" }] },
        { name: "parcelas_mensais", type: "object", fields: [{ name: "status", type: "string" }, { name: "detalhes", type: "string" }] },
        { name: "chaves", type: "object", fields: [{ name: "status", type: "string" }, { name: "detalhes", type: "string" }] },
        { name: "pos_chaves", type: "object", fields: [{ name: "status", type: "string" }, { name: "detalhes", type: "string" }] },
      ]
    },
    { name: "Termo", type: "object", fields: [{ name: "status", type: "string" }, { name: "detalhes", type: "string" }] },
    {
      name: "pessoas",
      type: "array",
      items: {
        name: "pessoa",
        type: "object",
        fields: [
          { name: "papel", type: "string" },
          { name: "status", type: "string" },
          { name: "detalhes", type: "string" },
        ]
      }
    },
    { name: "validacao_endereco", type: "object", fields: [{ name: "status", type: "string" }, { name: "detalhes", type: "string" }] },
    { name: "Documentos", type: "object", fields: [{ name: "status", type: "string" }, { name: "detalhes", type: "string" }] },
  ]
};
