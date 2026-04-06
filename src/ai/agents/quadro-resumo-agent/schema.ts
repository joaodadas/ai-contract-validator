import { z } from "zod";

const parcelaGrupoSchema = z.object({
  nome_grupo: z.string(),
  qtd_parcelas: z.number(),
  valor_parcela: z.number(),
  valor_total_grupo: z.number(),
  data_inicio: z.string(),
  data_fim: z.string(),
});

const reforcoSchema = z.object({
  descricao: z.string(),
  valor: z.number(),
  data_vencimento: z.string(),
});

const compradorSchema = z.object({
  nome: z.string(),
  cpf: z.string(),
  tipo: z.string(),
  renda: z.number(),
  ocupacao: z.string(),
  estado_civil: z.string(),
  endereco: z.string().optional().default(""),
  bairro: z.string().optional().default(""),
  cidade: z.string().optional().default(""),
  estado: z.string().optional().default(""),
  cep: z.string().optional().default(""),
  telefone: z.string().optional().default(""),
  rg: z.string().optional().default(""),
  nacionalidade: z.string().optional().default(""),
});

export const quadroResumoSchema = z.object({
  document_type: z.literal("QuadroResumo"),
  schema_version: z.literal("2.0"),
  output: z.object({
    imovel: z.object({
      empreendimento: z.string(),
      unidade: z.string(),
      bloco: z.string(),
    }),
    compradores: z.array(compradorSchema),
    financeiro: z.object({
      valor_venda_total: z.number(),
      sinal_ato: z.number(),
      financiamento_bancario: z.number(),
      subsidio_total: z.number(),
      parcelas_mensais: z.array(parcelaGrupoSchema),
      reforcos_anuais: z.array(reforcoSchema),
      chaves: z.object({
        valor: z.number(),
        vencimento: z.string(),
      }),
      pos_chaves: z.array(parcelaGrupoSchema),
      data_entrega_imovel: z.string(),
    }),
  }),
});

export type QuadroResumoOutput = z.infer<typeof quadroResumoSchema>;
