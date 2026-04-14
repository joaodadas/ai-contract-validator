# Design: Correções de Extração e Validação

**Data:** 2026-04-14
**Escopo:** 4 correções no pipeline de extração/validação de documentos

---

## Contexto

O pipeline de validação de contratos tem 4 bugs/limitações identificados:

1. PDFs digitais perdem contexto visual ao serem enviados ao LLM apenas como texto
2. A grade de divergências mostra pessoas (ex: cônjuge) sem documentos analisados
3. O fluxo não suporta múltiplos compradores/titulares
4. O termo de ciência não reconhece assinatura via Gov.br

---

## Fix 1: PDFs digitais — enviar texto + visual

### Problema

`documentDownloader.ts` descarta o buffer original do PDF quando consegue extrair texto. O agente recebe apenas texto puro, perdendo layout, assinaturas, emblemas e formatação visual. Documentos de identidade (CNH, RG, certidões) dependem de contexto visual.

### Solução

Preservar o buffer do PDF mesmo quando texto é extraído. Enviar ambos ao LLM.

### Arquivos alterados

**`src/lib/cvcrm/documentDownloader.ts`**
- No retorno de PDFs com texto extraído, manter `imageData` (buffer) e `imageMimeType` junto com `text`
- O tipo `DocumentContent` precisa permitir ter `text` E `imageData` simultaneamente

**`src/ai/orchestrator/agentDocumentMapper.ts`** → `buildAgentInput()`
- Quando `doc.contentType === "text"` E `doc.imageData` existe, adicionar o PDF como `FilePart` além do texto no prompt
- Resultado: LLM recebe texto extraído (precisão textual) + PDF visual (contexto visual)

### Impacto em tokens

Aumenta consumo de tokens (~2x por documento digital). Trade-off aceito pelo user em favor de precisão.

---

## Fix 2: Validação — array dinâmico de pessoas

### Problema

O schema do `validation-agent` tem campos fixos (`titular`, `conjuge`, `comprador`). O LLM sempre preenche todos, marcando como "Divergente" pessoas sem documentos analisados. Exemplo: cônjuge aparece como divergente mesmo sem nenhum documento dele ter sido lido.

### Solução

Trocar o campo `pessoas` de objeto fixo para array dinâmico. O LLM só inclui no array pessoas cujos documentos foram efetivamente extraídos e estão nos dados consolidados.

### Arquivos alterados

**`src/ai/agents/validation-agent/schema.ts`**
- Substituir:
  ```typescript
  pessoas: z.object({
    titular: statusField,
    conjuge: statusField,
    comprador: statusField,
    validacao_endereco: statusField,
  })
  ```
- Por:
  ```typescript
  pessoas: z.array(z.object({
    papel: z.string(),  // "titular", "conjuge", "comprador", "fiador", etc.
    ...statusFields     // status, detalhes, etc.
  }))
  validacao_endereco: statusField  // mantém separado, é sobre endereço
  ```

**`src/ai/agents/validation-agent/prompt.ts`**
- Adicionar instrução: "No array `pessoas`, inclua APENAS pessoas cujos documentos foram extraídos e estão presentes nos dados consolidados. Não analise nem inclua pessoas mencionadas apenas no Quadro Resumo que não tiveram documentos lidos."
- Instruir o campo `papel` com valores esperados

**`src/ai/orchestrator/contractOrchestrator.ts`**
- No Phase 4 (cross-validation), incluir no input metadata sobre quais pessoas tiveram documentos analisados, para guiar o LLM

**`src/ai/validation/report-formatter.ts`**
- Adaptar `formatValidationReport()` para iterar o array `pessoas` em vez de campos fixos (`titular`, `conjuge`, `comprador`)

**`src/components/extraction-detail.tsx`** (se renderiza pessoas)
- Adaptar renderização para array dinâmico

---

## Fix 3: Fluxo multi-buyer

### Problema

O schema do `fluxo-agent` tem `nome_titular: z.string()` e `cpf_titular: z.string()` — campos únicos. Reservas com múltiplos compradores perdem dados.

### Solução

Substituir campos singulares por array de titulares.

### Arquivos alterados

**`src/ai/agents/fluxo-agent/schema.ts`**
- Substituir:
  ```typescript
  nome_titular: z.string()
  cpf_titular: z.string()
  ```
- Por:
  ```typescript
  titulares: z.array(z.object({
    nome: z.string(),
    cpf: z.string(),
  }))
  ```

**`src/ai/agents/fluxo-agent/prompt.ts`**
- Atualizar instrução de extração: "Extraia TODOS os compradores/titulares listados no documento. Retorne um array com nome e CPF de cada um."

**`src/ai/validation/financial-comparison.ts`**
- Verificar se usa `nome_titular`/`cpf_titular` do fluxo. Se sim, adaptar para o array `titulares`.

**`src/ai/agents/validation-agent/prompt.ts`**
- Se o prompt de cross-validation referencia `nome_titular`/`cpf_titular` do fluxo, atualizar referência para `titulares[]`.

---

## Fix 4: Termo Gov.br

### Problema

O prompt do `termo-agent` menciona "handwritten, digital, or electronic" de forma vaga. Gov.br (plataforma de assinatura digital do governo) pode não ser reconhecido como assinatura válida.

### Solução

Explicitar Gov.br e ICP-Brasil no prompt. Adicionar campo de tipo de assinatura para audit trail.

### Arquivos alterados

**`src/ai/agents/termo-agent/prompt.ts`**
- Adicionar instrução explícita: "Considere como assinado (`assinado: true`) documentos que apresentem: assinatura manuscrita, assinatura digital ICP-Brasil, assinatura via Gov.br (plataforma gov.br/assine), assinatura eletrônica, ou qualquer selo/carimbo de assinatura digital válida."

**`src/ai/agents/termo-agent/schema.ts`**
- Adicionar campo:
  ```typescript
  tipo_assinatura: z.enum([
    "manuscrita",
    "digital_icp_brasil",
    "gov_br",
    "eletronica",
    "nao_assinado"
  ]).optional()
  ```

---

## Fora de escopo

- Reduzir contratos extraídos (todos têm uso real no pipeline)
- Retry automático no webhook
- Rate limiting

---

## Ordem de implementação sugerida

1. **Fix 4 (Termo Gov.br)** — menor risco, só prompt + campo opcional
2. **Fix 3 (Fluxo multi-buyer)** — schema change isolado
3. **Fix 1 (PDFs digitais)** — mudança no pipeline de download/input
4. **Fix 2 (Pessoas na validação)** — maior impacto, toca schema + prompt + formatter + UI

---

## Testes necessários

- Fix 1: Verificar que `DocumentContent` com texto + imageData é construído corretamente; `buildAgentInput()` gera text parts + file parts
- Fix 2: Testes do report-formatter com array de pessoas; testes do schema de validação
- Fix 3: Testes do schema de fluxo com 1 e múltiplos titulares; financial-comparison com novo formato
- Fix 4: Testes do schema de termo com todos os tipos de assinatura
