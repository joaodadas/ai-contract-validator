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

const chavesSchema = z.object({
  valor: z.number(),
  data_vencimento: z.string(),
});

export const fluxoSchema = z.object({
  document_type: z.literal("Fluxo"),
  schema_version: z.literal("3.0"),
  output: z.object({
    dados_cadastrais: z.object({
      empreendimento: z.string(),
      unidade: z.string(),
      bloco: z.string(),
      titulares: z.array(z.object({
        nome: z.string(),
        cpf: z.string(),
        score: z.number(),
      })),
    }),
    financeiro: z.object({
      valor_venda_total: z.number(),
      sinal_ato: z.number(),
      financiamento_bancario: z.number(),
      subsidio: z.number(),
      subsidio_outros: z.number(),
      financiamento_total: z.number(),
      parcelas_mensais: z.array(parcelaGrupoSchema),
      reforcos_anuais: z.array(reforcoSchema),
      chaves: chavesSchema,
      pos_chaves: z.array(parcelaGrupoSchema),
    }),
  }),
});

export type FluxoOutput = z.infer<typeof fluxoSchema>;
