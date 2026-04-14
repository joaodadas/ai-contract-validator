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

## Regra transversal: prompts com JSON de exemplo

Cada agente tem um JSON de exemplo hardcoded no prompt (ex: `FLUXO_PROMPT` linhas 8-58, `VALIDATION_PROMPT` linhas 114-145, `TERMO_PROMPT` linhas 10-16). O LLM usa esse JSON como template da resposta. **Toda mudança de schema Zod DEVE atualizar o JSON correspondente no prompt, ou o LLM vai gerar o formato antigo.**

Mesma regra para `schema_version`: bumpar quando o schema muda (ex: "2.0" → "3.0" no fluxo).

---

## Fix 1: PDFs digitais — enviar texto + visual

### Problema

`documentDownloader.ts` (linhas 139-143) descarta o buffer original do PDF quando consegue extrair texto. O retorno é `{contentType: "text", text}` sem `imageData`. O `buildAgentInput()` (agentDocumentMapper.ts:76-81) então envia apenas texto pro LLM, sem contexto visual.

Documentos de identidade (CNH, RG, certidões) dependem de layout visual, assinaturas e emblemas que se perdem no texto puro.

### Solução

Preservar o buffer do PDF mesmo quando texto é extraído. Enviar ambos ao LLM.

### Arquivos alterados

**`src/lib/cvcrm/documentDownloader.ts`** (linhas 139-143)
- O tipo `DocumentContent` (linhas 4-14) já permite `text` e `imageData` simultaneamente — ambos são opcionais. Nenhuma mudança de tipo necessária.
- Mudar o retorno de PDFs com texto extraído de:
  ```typescript
  return { ...base, contentType: "text", text };
  ```
  Para:
  ```typescript
  return { ...base, contentType: "text", text, imageData: buffer, imageMimeType: "application/pdf" };
  ```

**`src/ai/orchestrator/agentDocumentMapper.ts`** → `buildAgentInput()` (linhas 76-81)
- No branch `doc.contentType === "text" && doc.text`, adicionar check:
  ```typescript
  if (doc.imageData && doc.imageMimeType === "application/pdf") {
    files.push({ data: doc.imageData, mimeType: "application/pdf" });
  }
  ```
- Atualizar o texto header de "DOCUMENTO" para "DOCUMENTO (PDF DIGITAL)" quando tem ambos
- Resultado: LLM recebe texto extraído (precisão textual) + PDF como arquivo (contexto visual)

### Impacto em tokens

Aumenta consumo de tokens (~2x por documento digital). Trade-off aceito pelo user em favor de precisão.

---

## Fix 2: Validação — array dinâmico de pessoas

### Problema

O schema do `validation-agent` (schema.ts:22-27) tem campos fixos:
```typescript
pessoas: z.object({
  titular: statusField,
  conjuge: statusField,
  comprador: statusField,
  validacao_endereco: statusField,
})
```

O prompt (linhas 86-104) diz "analisar separadamente cada perfil listado na entrada" e o JSON de exemplo (linhas 131-139) mostra campos fixos. O LLM sempre preenche todos, marcando como "Divergente" pessoas sem documentos analisados.

### Solução

Trocar `pessoas` de objeto fixo para array dinâmico. Mover `validacao_endereco` para fora de `pessoas` (é sobre endereço, não uma pessoa). O LLM só inclui no array pessoas cujos documentos foram efetivamente extraídos.

### Arquivos alterados (6 arquivos)

**`src/ai/agents/validation-agent/schema.ts`**
- Substituir `pessoas` por:
  ```typescript
  pessoas: z.array(z.object({
    papel: z.string(),
    status: z.enum(["Igual", "Divergente", "Ignorado"]),
    detalhes: z.string(),
  }))
  ```
- Mover `validacao_endereco` para nível raiz do schema (irmão de `dados_imovel`, `financeiro`, etc.)
- Atualizar `ValidationOutput` type export

**`src/ai/agents/validation-agent/prompt.ts`**
- Atualizar seção "4. REGRAS PARA PESSOAS" (linhas 70-76):
  - Adicionar: "No array `pessoas`, inclua APENAS pessoas cujos documentos foram extraídos e estão presentes em `dados_extraidos`. Se um perfil (ex: cônjuge) é mencionado no Quadro Resumo mas não teve documentos lidos, NÃO o inclua no array."
  - Instruir campo `papel` com valores: "titular", "conjuge", "comprador", "fiador"
- Atualizar seção "5. DOCUMENTOS E FIADOR" (linhas 77-104):
  - Clarificar que a checklist de documentos por pessoa só se aplica a pessoas com docs
- **CRÍTICO**: Atualizar o JSON de exemplo (linhas 130-139) para refletir o novo formato:
  ```json
  "pessoas": [
    { "papel": "titular", "status": "", "detalhes": "" }
  ],
  "validacao_endereco": { "status": "", "detalhes": "" }
  ```

**`src/ai/orchestrator/contractOrchestrator.ts`** → `runCrossValidation()` (linhas 190-214)
- No `validationInput`, incluir campo `pessoas_com_documentos` listando quais papéis tiveram documentos extraídos. Derivar do `extractionResults`: verificar quais agentes de pessoa (rgcpf, cnh, comprovante-residencia, certidao-estado-civil, etc.) retornaram `ok: true`.

**`src/ai/validation/report-formatter.ts`**
- `collectDivergentItems()` (linhas 20-46) itera recursivamente campos de objetos. Para array de pessoas, adicionar check: se o valor é um array, iterar os items e usar `item.papel` como key ao invés da key do objeto.

**`src/components/validation-report.tsx`**
- Atualizar tipo `ValidationData` (linhas 24-45):
  - `pessoas` muda de objeto para `Array<{papel: string; status: StatusValue; detalhes: string}>`
  - `validacao_endereco` move pra nível raiz
- Atualizar `FIELD_LABELS` (linhas 74-87): remover `titular`, `conjuge`, `comprador` fixos
- Atualizar `resolveFields()` (linhas 231-239): não funciona com array — criar nova função `resolvePessoasFields()` que mapeia `item.papel` para label
- Na renderização da seção "Pessoas" (linhas 317-322): usar a nova função
- Mover renderização de `validacao_endereco` para a seção "Imóvel" ou criar seção "Endereço" própria
- `SummaryBar.countFields()` (linhas 165-177): adaptar para contar items de array também

**`src/components/extraction-detail.tsx`**
- Labels `FIELD_LABELS` (linhas 37, 44, 72): verificar se renderiza dados de pessoas do validation output; se sim, adaptar pra formato array

---

## Fix 3: Fluxo multi-buyer

### Problema

O schema do `fluxo-agent` (schema.ts:27-33) tem campos singulares:
```typescript
dados_cadastrais: z.object({
  empreendimento: z.string(),
  unidade: z.string(),
  bloco: z.string(),
  nome_titular: z.string(),
  cpf_titular: z.string(),
  score: z.number(),
})
```

Reservas com múltiplos compradores perdem dados do segundo comprador.

### Solução

Substituir campos singulares por array. Mover `score` pra dentro do array (cada comprador tem seu score). Bumpar `schema_version` de "2.0" para "3.0".

### Arquivos alterados (4 arquivos)

**`src/ai/agents/fluxo-agent/schema.ts`**
- Substituir em `dados_cadastrais`:
  ```typescript
  titulares: z.array(z.object({
    nome: z.string(),
    cpf: z.string(),
    score: z.number(),
  }))
  ```
- Remover `nome_titular`, `cpf_titular`, `score` do nível raiz de `dados_cadastrais`
- Bumpar `schema_version` de `z.literal("2.0")` para `z.literal("3.0")`

**`src/ai/agents/fluxo-agent/prompt.ts`**
- **CRÍTICO**: Atualizar o JSON de exemplo SCHEMA (linhas 12-18) para:
  ```json
  "dados_cadastrais": {
    "empreendimento": "string",
    "unidade": "string",
    "bloco": "string",
    "titulares": [
      { "nome": "string", "cpf": "string (11 digits only)", "score": 0 }
    ]
  }
  ```
- Atualizar `schema_version` no JSON de "2.0" para "3.0"
- Atualizar instrução (linha 69): "dados_cadastrais: Extraia os dados do empreendimento e de TODOS os compradores/titulares listados no documento. Retorne um array `titulares` com nome, CPF e score de cada um. Se o score não estiver presente para um comprador, retorne 0."
- Atualizar instrução do score (linha 70): mover pra dentro da regra de titulares

**`src/ai/agents/validation-agent/prompt.ts`** (linha 78)
- A regra já diz "o score mais alto prevalece" — atualizar referência: "O score dos titulares está em `fluxo-agent.output.dados_cadastrais.titulares[].score`. Use o maior score entre todos os titulares para a regra de fiador."

**`src/components/extraction-detail.tsx`**
- Labels `nome_titular` (linha 44) e `cpf_titular` (linha 72) precisam adaptar
- A renderização de arrays já existe (linha 197: "Array of objects") — verificar se funciona com o novo formato `titulares`

**`src/ai/validation/financial-comparison.ts`**
- Verificado: NÃO usa `nome_titular`/`cpf_titular` — só usa campos de `financeiro`. Nenhuma mudança necessária.

---

## Fix 4: Termo Gov.br

### Problema

O prompt do `termo-agent` (prompt.ts:20) diz "handwritten, digital, or electronic" de forma vaga. Gov.br (plataforma de assinatura digital do governo) pode não ser reconhecido como assinatura válida.

### Solução

Explicitar Gov.br e ICP-Brasil no prompt. Adicionar campo de tipo de assinatura para audit trail. Bumpar `schema_version` de "1.0" para "1.1".

### Arquivos alterados (2 arquivos)

**`src/ai/agents/termo-agent/prompt.ts`**
- Linha 20: Substituir regra de assinatura por:
  "assinado: true se o documento apresentar qualquer tipo de assinatura válida, incluindo: assinatura manuscrita, assinatura digital ICP-Brasil, assinatura via plataforma Gov.br (gov.br/assine), assinatura eletrônica, ou qualquer selo/carimbo de assinatura digital válida. false apenas se não houver nenhuma evidência de assinatura."
- Adicionar regra: "tipo_assinatura: Identifique o tipo de assinatura presente. Use 'manuscrita' para assinaturas à mão, 'gov_br' para assinaturas via Gov.br, 'digital_icp_brasil' para certificados ICP-Brasil, 'eletronica' para outras assinaturas eletrônicas. Se não assinado, use 'nao_assinado'."
- **CRÍTICO**: Atualizar o JSON de exemplo SCHEMA (linhas 10-16) para incluir:
  ```json
  "tipo_assinatura": "manuscrita | digital_icp_brasil | gov_br | eletronica | nao_assinado"
  ```
- Atualizar `schema_version` no JSON de "1.0" para "1.1"

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
- Bumpar `schema_version` de `z.literal("1.0")` para `z.literal("1.1")`

---

## Fora de escopo

- Reduzir contratos extraídos (todos têm uso real no pipeline)
- Retry automático no webhook
- Rate limiting

---

## Ordem de implementação sugerida

1. **Fix 4 (Termo Gov.br)** — menor risco, só prompt + campo opcional, 2 arquivos
2. **Fix 3 (Fluxo multi-buyer)** — schema change isolado, 4 arquivos
3. **Fix 1 (PDFs digitais)** — mudança no pipeline de download/input, 2 arquivos
4. **Fix 2 (Pessoas na validação)** — maior impacto e complexidade, 6 arquivos, toca schema + prompt + orchestrator + formatter + 2 componentes UI

---

## Testes necessários

### Fix 1
- Unit test: `downloadDocument()` com PDF digital retorna `text` + `imageData` + `imageMimeType`
- Unit test: `buildAgentInput()` com doc que tem `text` + `imageData` gera `textParts` E `files`
- Unit test: `buildAgentInput()` com doc só texto (sem imageData) mantém comportamento atual

### Fix 2
- Unit test: `validationSchema.parse()` com array de pessoas (1 pessoa, 2 pessoas, array vazio)
- Unit test: `collectDivergentItems()` com novo formato array
- Unit test: `formatValidationReport()` com pessoas array — divergentes aparecem, iguais não
- Verificar: `contractOrchestrator.test.ts` — atualizar mocks para novo formato de validation output

### Fix 3
- Unit test: `fluxoSchema.parse()` com 1 titular e com 2 titulares
- Unit test: schema rejeita formato antigo (`nome_titular`/`cpf_titular` diretos)
- Verificar: `financial-comparison.test.ts` — não deve precisar de mudanças (não usa dados de titular)
- Verificar: `contractOrchestrator.test.ts` — atualizar mocks de fluxo output

### Fix 4
- Unit test: `termoSchema.parse()` com todos os valores de `tipo_assinatura`
- Unit test: `termoSchema.parse()` sem `tipo_assinatura` (campo opcional, deve aceitar)
- Unit test: schema rejeita `tipo_assinatura` com valor inválido
