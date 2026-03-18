import { z } from "zod";

const statusField = z.object({
  status: z.enum(["Igual", "Divergente", "Ignorado"]),
  detalhes: z.string(),
});

export const validationSchema = z.object({
  dados_imovel: z.object({
    nome_empreendimento: statusField,
    unidade_bloco: statusField,
  }),
  financeiro: z.object({
    valor_venda_total: statusField,
    financiamento: statusField,
    subsidio: statusField,
    parcelas_mensais: statusField,
    chaves: statusField,
    pos_chaves: statusField,
  }),
  Termo: statusField,
  pessoas: z.object({
    titular: statusField,
    conjuge: statusField,
    comprador: statusField,
    validacao_endereco: statusField,
  }),
  Documentos: statusField,
});

export type ValidationOutput = z.infer<typeof validationSchema>;
