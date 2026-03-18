type ParcelaGrupo = {
  nome_grupo: string;
  qtd_parcelas: number;
  valor_parcela: number;
  valor_total_grupo: number;
  data_inicio: string;
  data_fim: string;
};

type Reforco = {
  descricao: string;
  valor: number;
  data_vencimento: string;
};

type FluxoFinanceiro = {
  valor_venda_total: number;
  sinal_ato: number;
  financiamento_bancario: number;
  subsidio: number;
  subsidio_outros: number;
  parcelas_mensais: ParcelaGrupo[];
  reforcos_anuais: Reforco[];
  chaves: { valor: number; data_vencimento: string };
  pos_chaves: ParcelaGrupo[];
};

type QuadroFinanceiro = {
  valor_venda_total: number;
  sinal_ato: number;
  financiamento_bancario: number;
  subsidio_total: number;
  parcelas_mensais: ParcelaGrupo[];
  reforcos_anuais: Reforco[];
  chaves: { valor: number; vencimento: string };
  pos_chaves: ParcelaGrupo[];
  data_entrega_imovel: string;
};

type ComparisonItem = {
  item: string;
  fluxo: string;
  quadro: string;
  diferenca: string;
  status: "OK" | "DIVERGENTE";
};

export type FinancialComparisonResult = {
  status_geral: string;
  divergencias: Record<string, ComparisonItem>;
  todos_resultados: Record<string, ComparisonItem>;
};

const TOLERANCE = 1.0;

function sumArray<T>(arr: T[] | undefined, key: keyof T): number {
  if (!Array.isArray(arr)) return 0;
  return arr.reduce((acc, item) => {
    const val = parseFloat(String(item[key]));
    return acc + (isNaN(val) ? 0 : val);
  }, 0);
}

function compare(label: string, valFluxo: number | undefined, valQuadro: number | undefined): ComparisonItem {
  const vFluxo = parseFloat(String(valFluxo)) || 0;
  const vQuadro = parseFloat(String(valQuadro)) || 0;
  const diff = vFluxo - vQuadro;
  const absDiff = Math.abs(diff);
  const status = absDiff < TOLERANCE ? "OK" : "DIVERGENTE";

  return {
    item: label,
    fluxo: vFluxo.toFixed(2),
    quadro: vQuadro.toFixed(2),
    diferenca: diff.toFixed(2),
    status,
  };
}

export function compareFinancials(
  fluxo: FluxoFinanceiro | null | undefined,
  quadro: QuadroFinanceiro | null | undefined
): FinancialComparisonResult {
  if (!fluxo || !quadro) {
    return {
      status_geral: "ERRO: Dados financeiros incompletos",
      divergencias: {},
      todos_resultados: {},
    };
  }

  const totalMensaisFluxo = sumArray(fluxo.parcelas_mensais, "valor_total_grupo");
  const totalMensaisQuadro = sumArray(quadro.parcelas_mensais, "valor_total_grupo");

  const totalReforcosFluxo = sumArray(fluxo.reforcos_anuais, "valor");
  const totalReforcosQuadro = sumArray(quadro.reforcos_anuais, "valor");

  const totalPosChavesFluxo = sumArray(fluxo.pos_chaves, "valor_total_grupo");
  const totalPosChavesQuadro = sumArray(quadro.pos_chaves, "valor_total_grupo");

  const valorChavesFluxo = fluxo.chaves?.valor ?? 0;
  const valorChavesQuadro = quadro.chaves?.valor ?? 0;

  const subsidioFluxoTotal = (parseFloat(String(fluxo.subsidio)) || 0) + (parseFloat(String(fluxo.subsidio_outros)) || 0);
  const subsidioQuadroTotal = parseFloat(String(quadro.subsidio_total)) || 0;

  const resultados: Record<string, ComparisonItem> = {
    valor_venda_total: compare("Valor Total da Venda", fluxo.valor_venda_total, quadro.valor_venda_total),
    sinal_ato: compare("Sinal / Entrada", fluxo.sinal_ato, quadro.sinal_ato),
    financiamento: compare("Financiamento Bancário", fluxo.financiamento_bancario, quadro.financiamento_bancario),
    subsidio: compare("Subsídios", subsidioFluxoTotal, subsidioQuadroTotal),
    parcelas_mensais: compare("Soma Parcelas Mensais", totalMensaisFluxo, totalMensaisQuadro),
    reforcos_anuais: compare("Soma Reforços Anuais", totalReforcosFluxo, totalReforcosQuadro),
    chaves: compare("Parcela de Chaves", valorChavesFluxo, valorChavesQuadro),
    pos_chaves: compare("Soma Pós-Chaves", totalPosChavesFluxo, totalPosChavesQuadro),
  };

  const divergencias: Record<string, ComparisonItem> = {};
  let temErro = false;

  for (const [chave, valor] of Object.entries(resultados)) {
    if (valor.status === "DIVERGENTE") {
      divergencias[chave] = valor;
      temErro = true;
    }
  }

  return {
    status_geral: temErro
      ? "ATENÇÃO: DIVERGÊNCIAS FINANCEIRAS ENCONTRADAS"
      : "APROVADO: VALORES FINANCEIROS CONFEREM",
    divergencias,
    todos_resultados: resultados,
  };
}
