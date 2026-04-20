# Benchmark de Modelos: Gemini vs Grok

## Objetivo

Criar uma infraestrutura de benchmark que rode o pipeline completo de validação de contratos com diferentes modelos de IA (Google Gemini e xAI Grok), capturando tokens, custo e qualidade dos resultados para determinar a melhor combinação custo-benefício.

## Modelos Testados

### Google Gemini

| Model Key | Model ID | Input/1M | Output/1M | Notas |
|-----------|----------|----------|-----------|-------|
| `google_pro` | `gemini-2.5-pro` | $1.25 (≤200k) / $2.50 (>200k) | $10.00 (≤200k) / $15.00 (>200k) | Modelo mais capaz |
| `google_flash_25` | `gemini-2.5-flash` | $0.30 | $2.50 | Extração padrão |
| `google_flash` | `gemini-2.0-flash` | $0.10 | $0.40 | **Deprecated — shutdown Jun 2026** |

Fonte: https://ai.google.dev/pricing

### xAI Grok

| Model Key | Model ID | Input/1M | Output/1M | Notas |
|-----------|----------|----------|-----------|-------|
| `xai_grok3` | `grok-3` | $3.00 | $15.00 | Flagship Grok 3 |
| `xai_grok3_mini` | `grok-3-mini` | $0.30 | $0.50 | Leve e barato |
| `xai_grok3_mini_nr` | `grok-3-mini` | $0.30 | $0.50 | No-reasoning (reasoningEffort: "none") |

Fonte: https://docs.x.ai/developers/models, https://pricepertoken.com/pricing-page/model/xai-grok-3

**Nota**: xAI já lançou Grok 4, mas o usuário pediu Grok 3. O `@ai-sdk/xai` suporta `grok-3` e `grok-3-mini` como model IDs. O modo no-reasoning é controlado via provider option `reasoningEffort`.

## Alterações no Core

### 1. Novo provider xAI

**Pacote**: `@ai-sdk/xai` (instalar via npm)

**Env var**: `XAI_API_KEY` — adicionada ao `.env.local.example`

**`src/ai/_base/types.ts`** — expandir tipos:

```typescript
export type Provider = "google" | "xai";

export type ModelKey =
  | "google_flash"
  | "google_pro"
  | "google_flash_25"
  | "xai_grok3"
  | "xai_grok3_mini"
  | "xai_grok3_mini_nr";
```

**`src/ai/_base/llm.ts`** — adicionar modelos xAI ao `MODEL_MAP`:

```typescript
import { xai } from "@ai-sdk/xai";

export const MODEL_MAP = {
  google_flash: google("gemini-2.0-flash"),
  google_pro: google("gemini-2.5-pro"),
  google_flash_25: google("gemini-2.5-flash"),
  xai_grok3: xai("grok-3"),
  xai_grok3_mini: xai("grok-3-mini"),
  xai_grok3_mini_nr: xai("grok-3-mini"),  // mesmo model, reasoning desabilitado via providerOptions
} as const;
```

Para `xai_grok3_mini_nr`, o reasoning é desabilitado via `providerOptions` na chamada `generateText`:

```typescript
providerOptions: { xai: { reasoningEffort: "none" } }
```

### 2. Captura de token usage

**`src/ai/_base/llm.ts`** — `CallLLMResult` expandido:

```typescript
type TokenUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

type CallLLMResult = {
  text: string;
  provider: Provider;
  model: string;
  usage?: TokenUsage;  // NOVO
};
```

O `generateText` do AI SDK já retorna `usage` no response. Basta desestruturar:

```typescript
const { text, usage } = await generateText({ ... });
return {
  text,
  provider: params.provider,
  model: modelKey,
  usage: usage ? {
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    totalTokens: usage.totalTokens,
  } : undefined,
};
```

**`src/ai/_base/types.ts`** — `AgentResult` expandido:

```typescript
export type AgentResult<T> = {
  // ... campos existentes ...
  usage?: TokenUsage;  // NOVO — propagado de callLLM
};
```

**`runAgent.ts`** — propagar `usage` do último `callLLM` bem-sucedido para o `AgentResult`.

### 3. Provider options para no-reasoning

A `callLLM` recebe um campo opcional `providerOptions` que é passado diretamente ao `generateText`. Porém, para simplificar o uso, `llm.ts` mantém um mapa interno de providerOptions por modelKey:

```typescript
// Mapa automático — caller não precisa saber detalhes de provider
const MODEL_PROVIDER_OPTIONS: Partial<Record<ModelKey, Record<string, Record<string, unknown>>>> = {
  xai_grok3_mini_nr: { xai: { reasoningEffort: "none" } },
};
```

`callLLM` aplica automaticamente quando o modelKey tem entry nesse mapa.

**`DEFAULT_MODEL`** — adicionar entry para xAI:

```typescript
export const DEFAULT_MODEL: Record<Provider, ModelKey> = {
  google: "google_pro",
  xai: "xai_grok3",
};
```

**`FALLBACK_MODEL`** — adicionar fallbacks xAI:

```typescript
export const FALLBACK_MODEL: Partial<Record<ModelKey, ModelKey>> = {
  google_pro: "google_flash_25",
  xai_grok3: "xai_grok3_mini",
};
```

**Nota**: No benchmark, o modelo é forçado via `options.modelKey`, então fallbacks não se aplicam. Mas os defaults ficam configurados para uso futuro em produção.

## Backtest Fixtures

### Script de exportação: `scripts/export-backtest.ts`

1. Conecta ao banco de produção (read-only)
2. Busca reservas com status `approved` ou `confirmed` que tenham `cvcrmSnapshot` completo
3. Para cada reserva selecionada:
   - Salva `backtest/fixtures/{externalId}/reservation.json` — snapshot da reserva
   - Salva `backtest/fixtures/{externalId}/documents/` — documentos baixados (PDFs/imagens)
   - Salva `backtest/fixtures/{externalId}/ground-truth.json` — resultado atual da análise IA (`resultJson` do `reservation_audits`)
4. Cria `backtest/fixtures/manifest.json` — lista de fixtures com metadata

### Estrutura de diretórios

```
backtest/
├── fixtures/
│   ├── manifest.json
│   ├── 12345/
│   │   ├── reservation.json
│   │   ├── ground-truth.json
│   │   └── documents/
│   │       ├── cnh-titular.pdf
│   │       ├── contrato.pdf
│   │       └── ...
│   ├── 12346/
│   │   └── ...
│   └── ...
└── results/                    # gerado pelo benchmark
    └── 2026-04-20T14-30-00.json
```

**`.gitignore`**: Adicionar `backtest/fixtures/` (contém documentos reais/sensíveis). Manter `backtest/results/` tracked para histórico.

## Tabela de Pricing

**`src/ai/benchmark/pricing.ts`**:

```typescript
export const MODEL_PRICING: Record<ModelKey, { inputPer1M: number; outputPer1M: number }> = {
  google_pro:        { inputPer1M: 1.25,  outputPer1M: 10.00 },
  google_flash_25:   { inputPer1M: 0.30,  outputPer1M: 2.50  },
  google_flash:      { inputPer1M: 0.10,  outputPer1M: 0.40  },
  xai_grok3:         { inputPer1M: 3.00,  outputPer1M: 15.00 },
  xai_grok3_mini:    { inputPer1M: 0.30,  outputPer1M: 0.50  },
  xai_grok3_mini_nr: { inputPer1M: 0.30,  outputPer1M: 0.50  },
};
```

## Script de Benchmark

### `scripts/run-benchmark.ts`

**Parâmetros CLI**:
- `--fixtures <path>` — diretório de fixtures (default: `backtest/fixtures/`)
- `--models <keys>` — modelos a testar, separados por vírgula (default: todos)
- `--agents <names>` — agentes específicos a testar (default: todos)
- `--concurrency <n>` — paralelismo (default: 1 — sequencial para evitar rate limits)

**Fluxo**:

```
Para cada fixture (reserva):
  Para cada model (6 modelos):
    Configura override de modelo (todos os agentes usam o mesmo modelo)
    Roda analyzeContract() com os documentos da fixture
    Captura por agente:
      - ok/error (sucesso técnico)
      - usage (tokens input/output)
      - tempo de execução (ms)
      - dados extraídos (para comparação)
    Calcula custo: (promptTokens * inputPer1M + completionTokens * outputPer1M) / 1_000_000
```

**Comparação de qualidade**:
- Para cada agente × modelo, compara os campos extraídos contra o `ground-truth.json`
- Comparação field-by-field: marca cada campo como `match`, `mismatch`, ou `missing`
- Calcula % de match por agente e por modelo

### Relatório no terminal

```
══════════════════════════════════════════════════════════════════════
  MODEL BENCHMARK — 3 reservas × 6 modelos × 14 agentes
══════════════════════════════════════════════════════════════════════

┌───────────────────┬─────────┬──────────┬──────────┬─────────┬──────────┐
│ Modelo            │ Sucesso │ Match %  │ Tokens   │ Custo   │ Tempo    │
├───────────────────┼─────────┼──────────┼──────────┼─────────┼──────────┤
│ gemini-2.5-pro    │  98.0%  │  96.2%   │  245.1k  │ $3.12   │  12.3s   │
│ gemini-2.5-flash  │  95.0%  │  91.5%   │  230.4k  │ $0.64   │   4.1s   │
│ gemini-2.0-flash  │  90.0%  │  85.3%   │  218.9k  │ $0.11   │   3.2s   │
│ grok-3            │  97.0%  │  94.8%   │  260.2k  │ $4.68   │   8.2s   │
│ grok-3-mini       │  92.0%  │  88.1%   │  195.3k  │ $0.16   │   3.5s   │
│ grok-3-mini-nr    │  88.0%  │  82.4%   │  180.0k  │ $0.13   │   2.8s   │
└───────────────────┴─────────┴──────────┴──────────┴─────────┴──────────┘

CUSTO POR RESERVA (média):
  Melhor custo:     grok-3-mini-nr     $0.04/reserva
  Melhor qualidade: gemini-2.5-pro     $1.04/reserva
  Melhor tradeoff:  gemini-2.5-flash   $0.21/reserva (91.5% match)

DIVERGÊNCIAS vs GROUND TRUTH:
  grok-3-mini-nr: campo "valorEntrada" divergiu em 2/3 reservas (fluxo-agent)
  grok-3-mini:    campo "cpf" vazio em 1/3 reservas (rgcpf-agent)
```

**JSON de resultados**: Salva em `backtest/results/{timestamp}.json` com todos os dados brutos para análise posterior.

## Escopo — O que NÃO entra

- UI dedicada para visualizar resultados — o relatório CLI é suficiente
- Alteração da lógica de produção (fallback, retry) — só adiciona suporte ao provider xAI e captura de tokens
- Testes automatizados do script de benchmark — é uma ferramenta de análise, não código de produção
- Grok 4 — pode ser adicionado depois se os resultados do Grok 3 forem promissores

## Arquivos Tocados

| Arquivo | Tipo de mudança |
|---------|----------------|
| `package.json` | Adicionar `@ai-sdk/xai` |
| `.env.local.example` | Adicionar `XAI_API_KEY` |
| `src/ai/_base/types.ts` | Expandir `Provider`, `ModelKey`, `AgentResult` |
| `src/ai/_base/llm.ts` | Adicionar modelos xAI, capturar `usage` |
| `src/ai/_base/runAgent.ts` | Propagar `usage` no retorno |
| `src/ai/benchmark/pricing.ts` | **Novo** — tabela de custos |
| `scripts/export-backtest.ts` | **Novo** — exportar fixtures |
| `scripts/run-benchmark.ts` | **Novo** — rodar benchmark |
| `backtest/` | **Novo** — diretório de fixtures e resultados |
| `.gitignore` | Adicionar `backtest/fixtures/` |
