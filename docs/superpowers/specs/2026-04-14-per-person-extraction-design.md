# Design: Extração Per-Person

**Data:** 2026-04-14
**Escopo:** Propagar grupo de pessoa (titular/fiador/cônjuge) pelo pipeline de extração para que agentes de identidade rodem separadamente por pessoa.

---

## Problema

O `mapDocumentsToAgents()` mistura documentos de todas as pessoas (titular, fiador, cônjuge) num único grupo por tipo de documento. O `rgcpf-agent` recebe 2 RGs juntos e extrai só o primeiro. O validation agent não sabe que existem docs do fiador e reporta "não há documentos do fiador" mesmo quando existem.

Caso real: reserva 22766 — titular Vinícius + fiadora Vanessa. Os 6 documentos da Vanessa (RG, Certidão, Residência, 3 extratos) são ignorados ou misturados com os do Vinícius.

---

## Agentes de pessoa vs globais

Agentes de pessoa rodam N vezes (uma por grupo de pessoa). Agentes globais rodam uma vez (docs da reserva inteira).

**Agentes de pessoa:** rgcpf-agent, cnh-agent, comprovante-residencia-agent, declaracao-residencia-agent, certidao-estado-civil-agent, comprovante-renda-agent, carteira-trabalho-agent, carta-fiador-agent

**Agentes globais:** fluxo-agent, quadro-resumo-agent, planta-agent, ato-agent, termo-agent, validation-agent

---

## Mudanças por arquivo

### 1. `src/lib/cvcrm/documentDownloader.ts`

**Tipo `DocumentContent`** (linhas 4-14) — adicionar campo:
```typescript
pessoa?: string; // "titular", "fiador", "conjuge", etc. — propagado do grupo CVCRM
```

**`downloadAllDocuments()`** (linhas 202-239) — ao iterar `documentos` (Record<string, CvcrmDocumentoItem[]>), propagar a key do Record (que é o nome do grupo: "titular", "fiador", etc.) para cada `DocumentContent.pessoa` retornado.

Atualmente o loop é:
```typescript
for (const docs of Object.values(documentos)) {
```

Deve mudar para:
```typescript
for (const [grupo, docs] of Object.entries(documentos)) {
```

E no `downloadDocument()` ou após o download, setar `result.pessoa = grupo`.

**Contratos** não têm grupo de pessoa — `pessoa` fica `undefined` (são docs globais).

### 2. `src/ai/_base/types.ts`

**`AgentResult<T>`** — adicionar campo:
```typescript
pessoa?: string; // "titular", "fiador", etc. — preenchido pelo orchestrator
```

### 3. `src/ai/orchestrator/agentDocumentMapper.ts`

**Nova constante `PERSON_AGENTS`:**
```typescript
export const PERSON_AGENTS: AgentName[] = [
  "rgcpf-agent", "cnh-agent", "comprovante-residencia-agent",
  "declaracao-residencia-agent", "certidao-estado-civil-agent",
  "comprovante-renda-agent", "carteira-trabalho-agent", "carta-fiador-agent",
];
```

**`mapDocumentsToAgents()`** — lógica de key:
- Se o agente está em `PERSON_AGENTS` e o doc tem `pessoa` definida → key = `"agentName:pessoa"` (ex: `"rgcpf-agent:titular"`)
- Caso contrário → key = `"agentName"` (ex: `"fluxo-agent"`)

Retorno continua `Map<string, DocumentContent[]>` mas agora as keys podem ser compostas.

**`buildAgentInput()`** — sem mudança na lógica (recebe array de DocumentContent e gera AgentInput como antes).

### 4. `src/ai/orchestrator/contractOrchestrator.ts`

**`runExtraction()`** (linhas 85-123):
- Itera o Map de documentos
- Pra cada key, parseia `agentName` e `pessoa` (split por `":"`)
- Busca o runner pelo `agentName` em `EXTRACTION_AGENTS`
- Roda o agente normalmente
- Seta `result.pessoa = pessoa` no `AgentResult` retornado

**`runCrossValidation()`** (linhas 190-214):
- Consolida `extractionResults` separando por pessoa vs global:
```typescript
const consolidatedData = {
  por_pessoa: {} as Record<string, Record<string, unknown>>,
  global: {} as Record<string, unknown>,
};

for (const result of extractionResults) {
  if (result.ok && result.data) {
    if (result.pessoa) {
      if (!consolidatedData.por_pessoa[result.pessoa]) {
        consolidatedData.por_pessoa[result.pessoa] = {};
      }
      consolidatedData.por_pessoa[result.pessoa][result.agent] = result.data;
    } else {
      consolidatedData.global[result.agent] = result.data;
    }
  }
}
```

- `validationInput` usa essa nova estrutura:
```typescript
const validationInput = {
  dados_extraidos: consolidatedData,
  comparacao_financeira: financialComparison,
  validacao_planta: plantaValidation,
  pessoas_com_documentos: Object.keys(consolidatedData.por_pessoa),
};
```

**`runFinancialComparison()`** — sem mudança (usa apenas fluxo e quadro-resumo que são globais).

**`runPlantaValidation()`** — sem mudança (usa apenas planta que é global).

**`analyzeContract()` return** — `results` agora contém múltiplos resultados do mesmo agente com `pessoa` diferente. O `ContractAnalysis` type não precisa mudar (é array de `AgentResult`), mas `summary.failed_agents` precisa considerar agente+pessoa.

### 5. `src/ai/agents/validation-agent/prompt.ts`

Atualizar a explicação da estrutura de input. O validation agent agora recebe:

```json
{
  "dados_extraidos": {
    "por_pessoa": {
      "titular": {
        "rgcpf-agent": { "output": { "nome": "Vinícius...", "cpf": "..." } },
        "comprovante-residencia-agent": { "output": { ... } }
      },
      "fiador": {
        "rgcpf-agent": { "output": { "nome": "Vanessa...", "cpf": "..." } },
        "carta-fiador-agent": { "output": { ... } }
      }
    },
    "global": {
      "fluxo-agent": { "output": { ... } },
      "quadro-resumo-agent": { "output": { ... } },
      "ato-agent": { "output": { ... } },
      "planta-agent": { "output": { ... } },
      "termo-agent": { "output": { ... } }
    }
  },
  "pessoas_com_documentos": ["titular", "fiador"]
}
```

Atualizar as regras:
- Seção "4. REGRAS PARA PESSOAS": referenciar `dados_extraidos.por_pessoa[papel]` em vez de misturar tudo
- Seção "5. DOCUMENTOS E FIADOR": checklist de documentos agora verifica por pessoa dentro de `por_pessoa`
- Score do titular: acessar via `dados_extraidos.global["fluxo-agent"].output.dados_cadastrais.titulares[].score`
- Comparação de endereço: comparar `dados_extraidos.por_pessoa[pessoa]["comprovante-residencia-agent"]` com `dados_extraidos.global["quadro-resumo-agent"]`

Atualizar o JSON de exemplo na seção ESTRUTURA DE SAÍDA — sem mudança no schema de saída (já é array dinâmico de pessoas desde o fix anterior).

### 6. `src/services/reservation.service.ts`

**`downloadAllDocuments()` call** (linha 227) — já passa `snapshot.documentos` que é `Record<string, CvcrmDocumentoItem[]>` com keys por pessoa. A mudança é interna ao `downloadAllDocuments()`.

Nenhuma mudança necessária neste arquivo.

### 7. Componentes UI (sem mudança obrigatória)

`validation-report.tsx` e `report-formatter.ts` já suportam o formato dinâmico de pessoas (array com `papel`). A exibição dos resultados de extração (`extraction-detail.tsx`) pode opcionalmente agrupar por pessoa, mas não é blocker.

---

## O que NÃO muda

- Schema do validation-agent (já usa array dinâmico de pessoas)
- Report formatter (já suporta array)
- Validation report UI (já suporta array)
- Financial comparison (usa dados globais)
- Planta validation (usa dados globais)
- Download de contratos (não têm grupo de pessoa)
- Webhook (recebe idreserva, não sabe de pessoas)
- Database schema (resultados armazenados como JSONB)

---

## Testes necessários

1. **documentDownloader**: `downloadAllDocuments()` propaga `pessoa` corretamente no `DocumentContent`
2. **agentDocumentMapper**: `mapDocumentsToAgents()` gera keys compostas pra agentes de pessoa e keys simples pra globais
3. **contractOrchestrator**: `runExtraction()` parseia keys compostas e seta `pessoa` no `AgentResult`
4. **contractOrchestrator**: `runCrossValidation()` consolida dados por pessoa vs global
5. **Integração**: reserva 22766 (titular + fiador) como teste end-to-end conceptual

---

## Ordem de implementação sugerida

1. `DocumentContent.pessoa` + `downloadAllDocuments()` propagação (foundation)
2. `AgentResult.pessoa` type change
3. `PERSON_AGENTS` + `mapDocumentsToAgents()` keys compostas
4. `runExtraction()` parse + set pessoa
5. `runCrossValidation()` consolidação por pessoa
6. `validation-agent/prompt.ts` nova estrutura de input
7. Testes e verificação com reserva 22766
