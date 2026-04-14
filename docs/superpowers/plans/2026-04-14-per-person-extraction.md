# Per-Person Document Extraction — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Propagate person group (titular/fiador/cônjuge) through the extraction pipeline so person-agents run separately per group, fixing the bug where fiador documents are mixed with titular.

**Architecture:** Add `pessoa` field to DocumentContent and AgentResult. The mapper generates composite keys (`"agentName:pessoa"`) for person-agents. The orchestrator parses these keys, runs each agent per-person, and consolidates results into `por_pessoa` vs `global` groups for the validation agent.

**Tech Stack:** TypeScript, Zod v4, Jest + ts-jest

**Spec:** `docs/superpowers/specs/2026-04-14-per-person-extraction-design.md`

---

## Task 1: Add `pessoa` field to DocumentContent and propagate in download

**Files:**
- Modify: `src/lib/cvcrm/documentDownloader.ts`
- Modify: `src/__tests__/ai/orchestrator/agentDocumentMapper.test.ts` (update test helpers)

- [ ] **Step 1: Add `pessoa` field to DocumentContent type**

In `src/lib/cvcrm/documentDownloader.ts`, add `pessoa` to the type (line 4-14):

```typescript
export type DocumentContent = {
  documentId: number;
  nome: string;
  tipo: string;
  contentType: "text" | "image";
  text?: string;
  imageData?: Buffer;
  imageMimeType?: string;
  link: string;
  error?: string;
  pessoa?: string;
};
```

- [ ] **Step 2: Propagate `pessoa` in downloadAllDocuments**

In `src/lib/cvcrm/documentDownloader.ts`, replace the documentos loop in `downloadAllDocuments()` (lines 210-215):

```
OLD:
  for (const docs of Object.values(documentos)) {
    if (!Array.isArray(docs)) continue;
    for (const doc of docs) {
      tasks.push(() => downloadDocument(doc));
    }
  }

NEW:
  for (const [grupo, docs] of Object.entries(documentos)) {
    if (!Array.isArray(docs)) continue;
    for (const doc of docs) {
      tasks.push(async () => {
        const result = await downloadDocument(doc);
        if (result) result.pessoa = grupo;
        return result;
      });
    }
  }
```

Contracts keep `pessoa` as `undefined` (no change to the contratos loop).

- [ ] **Step 3: Update test helpers in agentDocumentMapper.test.ts**

Add `pessoa` field to the `makeTextDoc`, `makeTextDocWithPdf`, and `makeImageDoc` helpers (default to `"titular"`):

In `src/__tests__/ai/orchestrator/agentDocumentMapper.test.ts`, update each helper:

```typescript
function makeTextDoc(overrides: Partial<DocumentContent> = {}): DocumentContent {
  return {
    documentId: 1,
    nome: "CNH_Digital.pdf",
    tipo: "CNH",
    contentType: "text",
    text: "NOME: João Silva\nCPF: 12345678900",
    link: "https://example.com/cnh.pdf",
    pessoa: "titular",
    ...overrides,
  };
}
```

Do the same for `makeTextDocWithPdf` and `makeImageDoc`.

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: All tests pass (field is optional, existing code doesn't break)

- [ ] **Step 5: Commit**

```bash
git add src/lib/cvcrm/documentDownloader.ts src/__tests__/ai/orchestrator/agentDocumentMapper.test.ts
git commit -m "feat: add pessoa field to DocumentContent and propagate in download

downloadAllDocuments now propagates the CVCRM document group key
(titular, fiador, conjuge) as pessoa on each DocumentContent.
Contracts keep pessoa undefined (global docs)."
```

---

## Task 2: Add `pessoa` field to AgentResult

**Files:**
- Modify: `src/ai/_base/types.ts`

- [ ] **Step 1: Add `pessoa` to AgentResult type**

In `src/ai/_base/types.ts`, add `pessoa` field to `AgentResult<T>` (line 49-58):

```typescript
export type AgentResult<T> = {
  agent: AgentName;
  ok: boolean;
  data?: T;
  error?: string;
  raw?: string;
  provider?: Provider;
  model?: string;
  attempts: number;
  pessoa?: string;
};
```

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: All tests pass (field is optional)

- [ ] **Step 3: Commit**

```bash
git add src/ai/_base/types.ts
git commit -m "feat: add pessoa field to AgentResult type

Allows extraction results to carry which person group (titular,
fiador, conjuge) the extraction was performed for."
```

---

## Task 3: Add PERSON_AGENTS constant and composite keys in mapper

**Files:**
- Modify: `src/ai/orchestrator/agentDocumentMapper.ts`
- Modify: `src/__tests__/ai/orchestrator/agentDocumentMapper.test.ts`

- [ ] **Step 1: Write failing tests for composite keys**

Add these tests to `src/__tests__/ai/orchestrator/agentDocumentMapper.test.ts`:

```typescript
import { mapDocumentsToAgents, PERSON_AGENTS } from "@/ai/orchestrator/agentDocumentMapper";

describe("mapDocumentsToAgents", () => {
  describe("person agents with pessoa field", () => {
    it("creates composite key for person agents", () => {
      const docs = [
        makeTextDoc({ tipo: "RG Principal", pessoa: "titular" }),
        makeTextDoc({ tipo: "RG Principal", pessoa: "fiador", nome: "RG_Fiador.pdf" }),
      ];
      const map = mapDocumentsToAgents(docs);

      expect(map.has("rgcpf-agent:titular")).toBe(true);
      expect(map.has("rgcpf-agent:fiador")).toBe(true);
      expect(map.get("rgcpf-agent:titular")).toHaveLength(1);
      expect(map.get("rgcpf-agent:fiador")).toHaveLength(1);
    });

    it("creates simple key for global agents", () => {
      const docs = [
        makeTextDoc({ tipo: "Fluxo", nome: "Fluxo.pdf", pessoa: "titular" }),
      ];
      const map = mapDocumentsToAgents(docs);

      expect(map.has("fluxo-agent")).toBe(true);
      expect(map.has("fluxo-agent:titular")).toBe(false);
    });

    it("creates simple key when pessoa is undefined (contracts)", () => {
      const docs = [
        makeTextDoc({ tipo: "Venda", nome: "Quadro Resumo v2.0", pessoa: undefined }),
      ];
      const map = mapDocumentsToAgents(docs);

      expect(map.has("quadro-resumo-agent")).toBe(true);
    });
  });

  describe("PERSON_AGENTS constant", () => {
    it("includes identity and person-related agents", () => {
      expect(PERSON_AGENTS).toContain("rgcpf-agent");
      expect(PERSON_AGENTS).toContain("cnh-agent");
      expect(PERSON_AGENTS).toContain("comprovante-residencia-agent");
      expect(PERSON_AGENTS).toContain("carta-fiador-agent");
    });

    it("does not include global agents", () => {
      expect(PERSON_AGENTS).not.toContain("fluxo-agent");
      expect(PERSON_AGENTS).not.toContain("quadro-resumo-agent");
      expect(PERSON_AGENTS).not.toContain("planta-agent");
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/__tests__/ai/orchestrator/agentDocumentMapper.test.ts`
Expected: FAIL — `PERSON_AGENTS` not exported, composite keys not generated

- [ ] **Step 3: Implement PERSON_AGENTS and composite key logic**

Replace `src/ai/orchestrator/agentDocumentMapper.ts` `mapDocumentsToAgents()` function and add the constant:

```typescript
import type { AgentName, AgentInput, ImagePart, FilePart } from "@/ai/_base/types";
import type { DocumentContent } from "@/lib/cvcrm/documentDownloader";
import {
  AGENT_DOCUMENT_TYPES,
  AGENT_CONTRACT_NAMES,
} from "@/lib/cvcrm/constants";

/**
 * Person agents run once per person group (titular, fiador, conjuge).
 * Global agents run once for the entire reservation.
 */
export const PERSON_AGENTS: AgentName[] = [
  "rgcpf-agent",
  "cnh-agent",
  "comprovante-residencia-agent",
  "declaracao-residencia-agent",
  "certidao-estado-civil-agent",
  "comprovante-renda-agent",
  "carteira-trabalho-agent",
  "carta-fiador-agent",
];

/**
 * Maps downloaded document contents to the agents that should process them.
 *
 * For person agents: creates composite keys like "rgcpf-agent:titular"
 * For global agents: creates simple keys like "fluxo-agent"
 */
export function mapDocumentsToAgents(
  contents: DocumentContent[],
): Map<string, DocumentContent[]> {
  const map = new Map<string, DocumentContent[]>();

  for (const doc of contents) {
    if (doc.error) continue;

    const lowerTipo = doc.tipo.toLowerCase();
    const lowerNome = doc.nome.toLowerCase();

    // Check document type mappings
    for (const [agent, types] of Object.entries(AGENT_DOCUMENT_TYPES)) {
      const matched = types?.some(
        (t) =>
          lowerTipo.includes(t.toLowerCase()) ||
          lowerNome.includes(t.toLowerCase()),
      );
      if (matched) {
        const agentName = agent as AgentName;
        const key = PERSON_AGENTS.includes(agentName) && doc.pessoa
          ? `${agent}:${doc.pessoa}`
          : agent;
        const existing = map.get(key) ?? [];
        existing.push(doc);
        map.set(key, existing);
      }
    }

    // Check contract name mappings (contracts have no pessoa — always global)
    for (const [agent, namePatterns] of Object.entries(AGENT_CONTRACT_NAMES)) {
      const matched = namePatterns?.some(
        (pattern) =>
          lowerNome.includes(pattern.toLowerCase()) ||
          lowerTipo.includes(pattern.toLowerCase()),
      );
      if (matched) {
        const existing = map.get(agent) ?? [];
        existing.push(doc);
        map.set(agent, existing);
      }
    }
  }

  return map;
}
```

Keep the existing `buildAgentInput()` function unchanged after this.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/__tests__/ai/orchestrator/agentDocumentMapper.test.ts`
Expected: All tests pass

- [ ] **Step 5: Run full test suite**

Run: `npm test`
Expected: Some tests in `contractOrchestrator.test.ts` may fail because `runExtraction` signature changed from `Map<AgentName, ...>` to `Map<string, ...>`. If so, update the type in those test mocks. The runtime behavior is the same for single-person reservations.

- [ ] **Step 6: Commit**

```bash
git add src/ai/orchestrator/agentDocumentMapper.ts src/__tests__/ai/orchestrator/agentDocumentMapper.test.ts
git commit -m "feat: add PERSON_AGENTS constant and composite keys in mapper

Person agents (rgcpf, cnh, etc.) now generate composite keys like
'rgcpf-agent:titular' when the document has a pessoa field. Global
agents (fluxo, quadro-resumo, etc.) keep simple keys."
```

---

## Task 4: Update orchestrator to parse composite keys and set pessoa

**Files:**
- Modify: `src/ai/orchestrator/contractOrchestrator.ts`

- [ ] **Step 1: Update runExtraction signature and logic**

Replace `runExtraction()` in `src/ai/orchestrator/contractOrchestrator.ts` (lines 85-123):

```typescript
/**
 * Phase 1: Run extraction agents in parallel.
 * Parses composite keys (e.g. "rgcpf-agent:titular") to run person agents
 * separately per person group.
 */
export async function runExtraction(
  documentMap: Map<string, DocumentContent[]>,
  contextJson: string,
  options?: AgentRunOptions,
): Promise<AgentResult<unknown>[]> {
  const keys = Array.from(documentMap.keys());

  return Promise.all(
    keys.map((key) => {
      // Parse composite key: "rgcpf-agent:titular" → agentName="rgcpf-agent", pessoa="titular"
      const colonIndex = key.indexOf(":");
      const agentName = (colonIndex >= 0 ? key.substring(0, colonIndex) : key) as AgentName;
      const pessoa = colonIndex >= 0 ? key.substring(colonIndex + 1) : undefined;

      const runner = EXTRACTION_AGENTS[agentName];
      if (!runner) {
        return Promise.resolve({
          agent: agentName,
          ok: false,
          error: `Unknown agent: ${agentName}`,
          attempts: 0,
          pessoa,
        } as AgentResult<unknown>);
      }

      const docs = documentMap.get(key);
      if (!docs || docs.length === 0) {
        console.log(`[orchestrator] No documents found for ${key}, skipping`);
        return Promise.resolve({
          agent: agentName,
          ok: false,
          error: "No documents found for this agent",
          attempts: 0,
          pessoa,
        } as AgentResult<unknown>);
      }

      const input = buildAgentInput(docs, contextJson);
      const label = pessoa ? `${agentName} [${pessoa}]` : agentName;
      console.log(
        `[orchestrator] Running ${label} with ${docs.length} document(s), text: ${input.text.length} chars, images: ${input.images?.length ?? 0}`,
      );

      return runner(input, options).then((result) => ({
        ...result,
        pessoa,
      }));
    }),
  );
}
```

- [ ] **Step 2: Remove `ALL_EXTRACTION_AGENTS` and the `agents` parameter**

The `agents` parameter is no longer needed — the map keys determine what runs. Remove:

```typescript
// DELETE these lines (49-63):
const ALL_EXTRACTION_AGENTS: AgentName[] = [
  "cnh-agent",
  "rgcpf-agent",
  // ... etc
];
```

- [ ] **Step 3: Update analyzeContract signature**

In `analyzeContract()` (line 236), remove the `agents` parameter and update the call:

```
OLD:
export async function analyzeContract(
  documentMap: Map<AgentName, DocumentContent[]>,
  contextJson: string,
  agents?: AgentName[],
  options?: AgentRunOptions,
  reservaPlanta?: { bloco: string; numero: string },
): Promise<ContractAnalysis> {
  const extractionResults = await runExtraction(documentMap, contextJson, agents, options);

NEW:
export async function analyzeContract(
  documentMap: Map<string, DocumentContent[]>,
  contextJson: string,
  options?: AgentRunOptions,
  reservaPlanta?: { bloco: string; numero: string },
): Promise<ContractAnalysis> {
  const extractionResults = await runExtraction(documentMap, contextJson, options);
```

- [ ] **Step 4: Update reservation.service.ts call**

In `src/services/reservation.service.ts` (line 260), remove the `undefined` args that were for `agents`:

```
OLD:
    const analysis = await analyzeContract(
      documentMap,
      contextJson,
      undefined,
      undefined,
      reservaPlanta,
    );

NEW:
    const analysis = await analyzeContract(
      documentMap,
      contextJson,
      undefined,
      reservaPlanta,
    );
```

- [ ] **Step 5: Run full test suite and fix orchestrator tests**

Run: `npm test`

If `contractOrchestrator.test.ts` fails, update mock calls to match new signatures:
- `runExtraction(map, context, options)` instead of `runExtraction(map, context, agents, options)`
- `analyzeContract(map, context, options, planta)` instead of `analyzeContract(map, context, agents, options, planta)`
- Map type is `Map<string, ...>` not `Map<AgentName, ...>`

- [ ] **Step 6: Commit**

```bash
git add src/ai/orchestrator/contractOrchestrator.ts src/services/reservation.service.ts
git commit -m "feat: parse composite keys in orchestrator for per-person extraction

runExtraction now parses keys like 'rgcpf-agent:titular', runs the
correct agent, and sets pessoa on the AgentResult. Removes unused
ALL_EXTRACTION_AGENTS array and agents parameter."
```

---

## Task 5: Update runCrossValidation to consolidate by person

**Files:**
- Modify: `src/ai/orchestrator/contractOrchestrator.ts`

- [ ] **Step 1: Replace runCrossValidation consolidation logic**

Replace `runCrossValidation()` (lines 190-231):

```typescript
/**
 * Phase 4: Run the AI validation agent to cross-reference all extracted data.
 * Separates results into per-person and global groups.
 */
export async function runCrossValidation(
  extractionResults: AgentResult<unknown>[],
  financialComparison: FinancialComparisonResult | undefined,
  plantaValidation: PlantaValidationResult | undefined,
  options?: AgentRunOptions,
): Promise<AgentResult<ValidationOutput>> {
  const porPessoa: Record<string, Record<string, unknown>> = {};
  const global: Record<string, unknown> = {};

  for (const result of extractionResults) {
    if (!result.ok || !result.data) continue;

    if (result.pessoa) {
      if (!porPessoa[result.pessoa]) {
        porPessoa[result.pessoa] = {};
      }
      porPessoa[result.pessoa][result.agent] = result.data;
    } else {
      global[result.agent] = result.data;
    }
  }

  const validationInput = {
    dados_extraidos: {
      por_pessoa: porPessoa,
      global,
    },
    comparacao_financeira: financialComparison,
    validacao_planta: plantaValidation,
    pessoas_com_documentos: Object.keys(porPessoa),
  };

  return runValidationAgent(
    { text: JSON.stringify(validationInput, null, 2) },
    options,
  );
}
```

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: All pass (or fix orchestrator test mocks if they assert on validationInput shape)

- [ ] **Step 3: Commit**

```bash
git add src/ai/orchestrator/contractOrchestrator.ts
git commit -m "feat: consolidate extraction results by person for cross-validation

runCrossValidation now separates results into por_pessoa (keyed by
titular/fiador/etc) and global (fluxo, quadro-resumo, etc).
pessoas_com_documentos is derived from actual extraction results."
```

---

## Task 6: Update validation-agent prompt for per-person input structure

**Files:**
- Modify: `src/ai/agents/validation-agent/prompt.ts`

- [ ] **Step 1: Update the prompt**

Replace the entire `VALIDATION_PROMPT` in `src/ai/agents/validation-agent/prompt.ts`:

```typescript
export const VALIDATION_PROMPT = `Você é um agente de validação de contratos imobiliários. Sua tarefa é comparar e cruzar dados extraídos de múltiplos documentos e produzir um relatório de validação estruturado em JSON.

ESTRUTURA DO INPUT:
O input contém dados organizados assim:
- dados_extraidos.por_pessoa: Documentos agrupados por pessoa (titular, fiador, conjuge). Cada pessoa contém os resultados dos agentes que processaram seus documentos.
- dados_extraidos.global: Documentos globais da reserva (fluxo-agent, quadro-resumo-agent, ato-agent, planta-agent, termo-agent).
- pessoas_com_documentos: Lista dos papéis que tiveram documentos analisados.

⛔ VOCABULÁRIO CONTROLADO (CRÍTICO) ⛔
Para o campo status, você só tem permissão para usar EXATAMENTE uma destas três strings. Qualquer outra variação (como "OK", "Pendente", "Validado", "Ausente") é PROIBIDA.

"Igual" (Use quando os dados batem ou quando todos os documentos estão presentes).

"Divergente" (Use quando há erro matemático, texto diferente ou documento faltando).

"Ignorado" (Uso exclusivo para campos de Renda e Ocupação).

Nunca em hipótese alguma coloque nos detalhes que algum documento ou situação foi ignorado.

⚠️ REGRA DE OURO PARA DETALHES ⚠️
Prova Real: Antes de marcar "Divergente", compare as strings/números. Se forem idênticos, marque "Igual".

Preenchimento de Detalhes:

Se Status "Igual" ou "Ignorado": detalhes DEVE ser uma string vazia "".

Se Status "Divergente": Explique o erro. Ex: "Valor X no Quadro e Y no Fluxo".

TODOS OS CAMPOS FALTANTES NECESSITAM SER INFORMADOS.

1. REGRAS DE EMPREENDIMENTO E UNIDADE
Nome do Empreendimento: Use comparação "Fuzzy". Compare dados_extraidos.global["quadro-resumo-agent"] com dados_extraidos.global["fluxo-agent"].

Unidade e Bloco:

Compare Quadro.imovel com Fluxo.dados_cadastrais.

Ignore zeros à esquerda (ex: "05" == "5"). Se os números forem iguais, Status: "Igual".

Validação Planta: Insira a validação da planta ao relatório final somente quando for divergente. Use a mensagem que veio junto a validação.

2. REGRAS FINANCEIRAS (VALORES E DATAS)
**Valores (Tolerância R$ 1,00):** Diferença < R$ 1,00 -> Status: "Igual".

Datas:

Compare vencimentos mensais SOMENTE o primeiro grupo, para reforços compare normalmente. Lembre-se que o Fluxo irá pular dezembro somente nas parcelas mensais de grupo, e em Dezembro parcela do tipo (Reforço). Se o dia/mês/ano mudar, marque "Divergente", deixe a mensagem bem detalhada de quais estão divergentes inclusive em parcelas anuais, especifique sempre em caso de divergência.

Para o empreendimento KENTUCKY pode haver casos onde o valor das chaves não venha em dezembro, SOMENTE PARA KENTUCKY isso é aceito. Poderá também haver parcelas mensais dos grupos principais que ocorrerão depois da parcela "chaves".

Para a data das chaves, comparar o valor contido em Quadro Resumo-> chaves vencimento com o valor em Quadro Resumo -> financeiro data_entrega_imovel. O Fluxo NÃO É UTILIZADO NESSA COMPARAÇÃO. Caso não exista valor pode considerar OK, o campo não é obrigatório.

**Ato: **

O valor do Ato em documentos deve sempre ser igual ao encontrado no Quadro Resumo, caso contrário coloque como divergente e explique o porquê.

Caso tenha mais de um Ato, some seus valores.

3. REGRAS DE ENDEREÇO
Para CADA pessoa em dados_extraidos.por_pessoa, compare o endereço do comprovante-residencia-agent ou declaracao-residencia-agent com os dados do Quadro Resumo.

Titularidade: OBRIGATÓRIO Comprovante de residência estar no nome do Titular e ou Comprador, ou podendo estar no nome da pessoa CASADA (marido ou esposa) vide nomes na certidão de estado civil, podendo também estar no nome da filiação/pais contida nos documentos. Considere também se houve "Nome morador declarado" na declaração de residência ou comprovante de residência.

Estado: Caso o estado esteja abreviado ele pode ser dado como igual ex.: PR -> Paraná.

Logradouro/Número:

Se o número da casa for diferente (ex: 283 vs 238) -> Status: "Divergente".

Se bater -> Status: "Igual".

Bairro:

O bairro não precisa de conferência.

4. REGRAS PARA PESSOAS
REGRA CRÍTICA: No array "pessoas", inclua APENAS as pessoas listadas em "pessoas_com_documentos". Para cada pessoa, os documentos estão em dados_extraidos.por_pessoa[papel]. NÃO inclua pessoas que não estejam nesta lista.

Para cada pessoa incluída no array, use o campo "papel" com o valor do grupo (ex: "titular", "conjuge", "comprador", "fiador").

Ocupação e Renda: Status "Ignorado". Detalhes: "".

Estado Civil/Certidão de nascimento: Ignore comparação do estado civil. Se houver alteracao_de_nome no documento e o Quadro estiver desatualizado -> Status: "Divergente".

Nome: Valide grafia comparando dados_extraidos.por_pessoa[papel]["rgcpf-agent"] ou ["cnh-agent"] com o Quadro Resumo. Caso exista nome social, ele também pode ser usado.

5. DOCUMENTOS E FIADOR
Score titular: (OBRIGATÓRIA VERIFICAÇÃO EM TODOS) O score dos titulares está em dados_extraidos.global["fluxo-agent"].output.dados_cadastrais.titulares[].score. Use o MAIOR score entre todos os titulares. Caso esse score mais alto seja menor que 450, valor vazio ou não houver informação, obrigatório fiador e documentos do fiador.

Termo: Verifique em dados_extraidos.global["termo-agent"]. Se assinado -> Status: "Igual". Se não -> "Divergente".

Carteira de Trabalho: No caso da Carteira de trabalho, ela será usada como documento de identificação, no caso de não haver nenhum outro, somente se o campo "Com FOTO" for true.

Análise de Documentos (Geral - CHECKLIST OBRIGATÓRIA):

O modelo DEVE analisar separadamente SOMENTE os perfis listados em "pessoas_com_documentos".

Para CADA PERFIL, verifique em dados_extraidos.por_pessoa[papel] se os seguintes agentes retornaram dados:

Identidade/CPF: "rgcpf-agent" ou "cnh-agent" ou "carteira-trabalho-agent" (se "Com FOTO": "True").

Comprovação de Renda: "comprovante-renda-agent" ou "carteira-trabalho-agent".

Comprovante de Residência: "comprovante-residencia-agent" ou "declaracao-residencia-agent" (Atenção: pode estar no bloco de outra pessoa, mas deve ser válido para o perfil analisado conforme Regra 3).

Certidão de Estado Civil: "certidao-estado-civil-agent".

Carta Fiador assinada: "carta-fiador-agent" — Obrigatória APENAS para o perfil "fiador", não compare nome, verifique somente assinatura.

Se FALTAR qualquer um dos documentos listados acima para QUALQUER pessoa em pessoas_com_documentos -> Status: "Divergente".

Preenchimento dos Detalhes: Especifique claramente QUEM está com pendência e O QUE falta. Exemplo: "Faltando para fiador: Certidão de Estado Civil. Faltando para titular: Comprovante de Residência".

Se TODAS as pessoas tiverem TODOS os documentos exigidos -> Status: "Igual" (Detalhes: "").

Quadro Resumo:

Caso o Quadro Resumo aponte um segundo comprador ou fiador, o mesmo precisa ter as informações dentro do Fluxo. Sempre deixe bem especificado nos detalhes caso falte informação.

ESTRUTURA DE SAÍDA (JSON)
Preencha para TODOS os campos abaixo usando apenas o vocabulário permitido.
Retorne SOMENTE o JSON, sem markdown, sem code fences, sem texto extra.

{
  "dados_imovel": {
      "nome_empreendimento": { "status": "", "detalhes": "" },
      "unidade_bloco": { "status": "", "detalhes": "" }
  },

  "financeiro": {
    "valor_venda_total": { "status": "", "detalhes": "" },
    "financiamento": { "status": "", "detalhes": "" },
    "subsidio": { "status": "", "detalhes": "" },
    "parcelas_mensais": { "status": "", "detalhes": "" },
    "chaves": { "status": "", "detalhes": "" },
    "pos_chaves": { "status": "", "detalhes": "" }
  },

  "Termo": { "status": "", "detalhes": "" },

  "pessoas": [
    { "papel": "titular", "status": "", "detalhes": "" }
  ],

  "validacao_endereco": { "status": "", "detalhes": "" },

  "Documentos": {
    "status": "",
    "detalhes": ""
  }
}`;
```

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: All pass (prompt is a string constant, no runtime validation)

- [ ] **Step 3: Commit**

```bash
git add src/ai/agents/validation-agent/prompt.ts
git commit -m "feat: update validation prompt for per-person input structure

Prompt now references dados_extraidos.por_pessoa[papel] for
person-specific data and dados_extraidos.global for reservation-wide
data. Document checklist checks per-person agent results."
```

---

## Task 7: Fix orchestrator tests and final verification

**Files:**
- Modify: `src/__tests__/ai/orchestrator/contractOrchestrator.test.ts` (if needed)

- [ ] **Step 1: Run full test suite**

Run: `npm test`

- [ ] **Step 2: Fix any failing orchestrator tests**

Common fixes needed:
- `runExtraction` signature: remove `agents` parameter from mock calls
- `analyzeContract` signature: remove `agents` parameter
- Map type: `Map<string, DocumentContent[]>` instead of `Map<AgentName, DocumentContent[]>`
- Mock results may need `pessoa` field

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: No TypeScript errors

- [ ] **Step 4: Run lint**

Run: `npm run lint`
Expected: No new errors

- [ ] **Step 5: Commit any test fixes**

```bash
git add -u
git commit -m "fix: update orchestrator tests for per-person extraction signatures"
```
