# Extraction & Validation Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 4 bugs in the contract validation pipeline: digital PDF extraction, dynamic people validation, multi-buyer fluxo support, and Gov.br signature recognition.

**Architecture:** Each fix is isolated — changes 2-6 files with TDD. Order: Termo Gov.br (lowest risk) → Fluxo multi-buyer → PDF digital dual-mode → Validation people array (highest complexity). Each task includes schema + prompt + test changes.

**Tech Stack:** TypeScript, Zod v4, Jest + ts-jest, Vercel AI SDK, Next.js 16

**Spec:** `docs/superpowers/specs/2026-04-14-extraction-fixes-design.md`

---

## Task 1: Termo Gov.br — Schema + Prompt

**Files:**
- Modify: `src/ai/agents/termo-agent/schema.ts`
- Modify: `src/ai/agents/termo-agent/prompt.ts`
- Create: `src/__tests__/ai/agents/termo-agent/schema.test.ts`

- [ ] **Step 1: Write the failing tests for the new schema**

```typescript
// src/__tests__/ai/agents/termo-agent/schema.test.ts
import { termoSchema } from "@/ai/agents/termo-agent/schema";

describe("termoSchema", () => {
  const validBase = {
    document_type: "TermoCiencia",
    schema_version: "1.1",
    output: {
      assinado: true,
      nome_assinante: "João Silva",
      data_assinatura: "2026-01-15",
      tipo_assinatura: "manuscrita",
    },
  };

  describe("tipo_assinatura", () => {
    it("accepts all valid enum values", () => {
      const values = ["manuscrita", "digital_icp_brasil", "gov_br", "eletronica", "nao_assinado"] as const;
      for (const tipo of values) {
        const data = { ...validBase, output: { ...validBase.output, tipo_assinatura: tipo } };
        const result = termoSchema.safeParse(data);
        expect(result.success).toBe(true);
      }
    });

    it("accepts missing tipo_assinatura (optional field)", () => {
      const { tipo_assinatura: _, ...outputWithout } = validBase.output;
      const data = { ...validBase, output: outputWithout };
      const result = termoSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("rejects invalid tipo_assinatura value", () => {
      const data = { ...validBase, output: { ...validBase.output, tipo_assinatura: "carimbo" } };
      const result = termoSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("schema_version", () => {
    it("accepts version 1.1", () => {
      const result = termoSchema.safeParse(validBase);
      expect(result.success).toBe(true);
    });

    it("rejects old version 1.0", () => {
      const data = { ...validBase, schema_version: "1.0" };
      const result = termoSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/__tests__/ai/agents/termo-agent/schema.test.ts`
Expected: FAIL — schema_version still expects "1.0", tipo_assinatura field doesn't exist

- [ ] **Step 3: Update the schema**

In `src/ai/agents/termo-agent/schema.ts`, replace entire content:

```typescript
import { z } from "zod";

export const termoSchema = z.object({
  document_type: z.literal("TermoCiencia"),
  schema_version: z.literal("1.1"),
  output: z.object({
    assinado: z.boolean(),
    nome_assinante: z.string(),
    data_assinatura: z.string(),
    tipo_assinatura: z.enum([
      "manuscrita",
      "digital_icp_brasil",
      "gov_br",
      "eletronica",
      "nao_assinado",
    ]).optional(),
  }),
});

export type TermoOutput = z.infer<typeof termoSchema>;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/__tests__/ai/agents/termo-agent/schema.test.ts`
Expected: PASS — all 4 tests green

- [ ] **Step 5: Update the prompt**

In `src/ai/agents/termo-agent/prompt.ts`, replace entire content:

```typescript
import { BASE_PROMPT } from "@/ai/_base/basePrompt";

export const TERMO_PROMPT = `${BASE_PROMPT}

DOCUMENT_TYPE: Termo de Ciência (Awareness/Acknowledgment Term)

SCHEMA:
{
  "document_type": "TermoCiencia",
  "schema_version": "1.1",
  "output": {
    "assinado": false,
    "nome_assinante": "string",
    "data_assinatura": "YYYY-MM-DD",
    "tipo_assinatura": "manuscrita | digital_icp_brasil | gov_br | eletronica | nao_assinado"
  }
}

SPECIFIC RULES:
- Determine if the Termo de Ciência has been signed.
- assinado: true se o documento apresentar qualquer tipo de assinatura válida, incluindo: assinatura manuscrita, assinatura digital ICP-Brasil, assinatura via plataforma Gov.br (gov.br/assine), assinatura eletrônica, ou qualquer selo/carimbo de assinatura digital válida. false apenas se não houver nenhuma evidência de assinatura.
- tipo_assinatura: Identifique o tipo de assinatura presente. Use "manuscrita" para assinaturas à mão, "gov_br" para assinaturas via Gov.br, "digital_icp_brasil" para certificados ICP-Brasil, "eletronica" para outras assinaturas eletrônicas. Se não assinado, use "nao_assinado".
- nome_assinante: Name of the person who signed. If not found or not signed, return "".
- data_assinatura: Date of signature in YYYY-MM-DD format. If not found, return "".
- If the document is not a Termo de Ciência, return assinado as false, tipo_assinatura as "nao_assinado", and other fields as empty strings.
`;
```

- [ ] **Step 6: Run full test suite**

Run: `npm test`
Expected: All existing tests still pass

- [ ] **Step 7: Commit**

```bash
git add src/ai/agents/termo-agent/schema.ts src/ai/agents/termo-agent/prompt.ts src/__tests__/ai/agents/termo-agent/schema.test.ts
git commit -m "feat: add Gov.br signature recognition to termo agent

Add tipo_assinatura enum field (manuscrita, digital_icp_brasil, gov_br,
eletronica, nao_assinado) and explicitly mention Gov.br/ICP-Brasil in
prompt. Bump schema_version 1.0 → 1.1."
```

---

## Task 2: Fluxo multi-buyer — Schema + Prompt

**Files:**
- Modify: `src/ai/agents/fluxo-agent/schema.ts`
- Modify: `src/ai/agents/fluxo-agent/prompt.ts`
- Create: `src/__tests__/ai/agents/fluxo-agent/schema.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/__tests__/ai/agents/fluxo-agent/schema.test.ts
import { fluxoSchema } from "@/ai/agents/fluxo-agent/schema";

function makeValidFluxo(overrides: Record<string, unknown> = {}) {
  return {
    document_type: "Fluxo",
    schema_version: "3.0",
    output: {
      dados_cadastrais: {
        empreendimento: "Kentucky",
        unidade: "101",
        bloco: "A",
        titulares: [
          { nome: "João Silva", cpf: "12345678900", score: 750 },
        ],
        ...overrides,
      },
      financeiro: {
        valor_venda_total: 500000,
        sinal_ato: 10000,
        financiamento_bancario: 300000,
        subsidio: 0,
        subsidio_outros: 0,
        parcelas_mensais: [],
        reforcos_anuais: [],
        chaves: { valor: 50000, data_vencimento: "2027-12-15" },
        pos_chaves: [],
      },
    },
  };
}

describe("fluxoSchema", () => {
  describe("titulares array", () => {
    it("accepts single titular", () => {
      const data = makeValidFluxo();
      const result = fluxoSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("accepts multiple titulares", () => {
      const data = makeValidFluxo({
        titulares: [
          { nome: "João Silva", cpf: "12345678900", score: 750 },
          { nome: "Maria Silva", cpf: "98765432100", score: 680 },
        ],
      });
      const result = fluxoSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.output.dados_cadastrais.titulares).toHaveLength(2);
      }
    });

    it("accepts empty titulares array", () => {
      const data = makeValidFluxo({ titulares: [] });
      const result = fluxoSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("requires nome, cpf, and score per titular", () => {
      const data = makeValidFluxo({
        titulares: [{ nome: "João" }],
      });
      const result = fluxoSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("schema_version", () => {
    it("accepts version 3.0", () => {
      const result = fluxoSchema.safeParse(makeValidFluxo());
      expect(result.success).toBe(true);
    });

    it("rejects old version 2.0", () => {
      const data = { ...makeValidFluxo(), schema_version: "2.0" };
      const result = fluxoSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("rejects old format", () => {
    it("rejects nome_titular/cpf_titular at root level", () => {
      const data = makeValidFluxo({
        nome_titular: "João",
        cpf_titular: "12345678900",
        score: 750,
        titulares: undefined,
      });
      const result = fluxoSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/__tests__/ai/agents/fluxo-agent/schema.test.ts`
Expected: FAIL — schema still has nome_titular/cpf_titular, version "2.0"

- [ ] **Step 3: Update the schema**

In `src/ai/agents/fluxo-agent/schema.ts`, replace the `dados_cadastrais` object and `schema_version`:

```typescript
import { z } from "zod";

const titularSchema = z.object({
  nome: z.string(),
  cpf: z.string(),
  score: z.number(),
});

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
      titulares: z.array(titularSchema),
    }),
    financeiro: z.object({
      valor_venda_total: z.number(),
      sinal_ato: z.number(),
      financiamento_bancario: z.number(),
      subsidio: z.number(),
      subsidio_outros: z.number(),
      parcelas_mensais: z.array(parcelaGrupoSchema),
      reforcos_anuais: z.array(reforcoSchema),
      chaves: chavesSchema,
      pos_chaves: z.array(parcelaGrupoSchema),
    }),
  }),
});

export type FluxoOutput = z.infer<typeof fluxoSchema>;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/__tests__/ai/agents/fluxo-agent/schema.test.ts`
Expected: PASS — all 6 tests green

- [ ] **Step 5: Update the prompt**

In `src/ai/agents/fluxo-agent/prompt.ts`, make these replacements:

Replace the `dados_cadastrais` section in the SCHEMA JSON (lines 12-18):
```
OLD:
    "dados_cadastrais": {
      "empreendimento": "string",
      "unidade": "string",
      "bloco": "string",
      "nome_titular": "string",
      "cpf_titular": "string (11 digits only)",
      "score": 0
    },

NEW:
    "dados_cadastrais": {
      "empreendimento": "string",
      "unidade": "string",
      "bloco": "string",
      "titulares": [
        { "nome": "string", "cpf": "string (11 digits only)", "score": 0 }
      ]
    },
```

Replace `"schema_version": "2.0"` with `"schema_version": "3.0"` in the SCHEMA JSON.

Replace the `dados_cadastrais` rule (line 69):
```
OLD:
- dados_cadastrais: Extract the buyer/enterprise info found at the top of the Fluxo document.
- score: Extract the credit score if present. If not found, return 0.

NEW:
- dados_cadastrais: Extraia os dados do empreendimento e de TODOS os compradores/titulares listados no documento. Retorne um array "titulares" com nome, CPF e score de cada um. Se o score não estiver presente para um comprador, retorne 0.
```

- [ ] **Step 6: Update validation prompt score reference**

In `src/ai/agents/validation-agent/prompt.ts`, find the score rule (line 78):
```
OLD:
Score titular: (OBRIGATÓRIA VERIFICAÇÃO EM TODOS) Caso o score do titular que está localizado no fluxo seja menor que 450, valor vazio ou não houver informação, obrigatório fiador e documentos do fiador. Para o caso de mais de um comprador, o score mais alto prevalece.

NEW:
Score titular: (OBRIGATÓRIA VERIFICAÇÃO EM TODOS) O score dos titulares está em fluxo-agent → output → dados_cadastrais → titulares[].score. Use o MAIOR score entre todos os titulares. Caso esse score mais alto seja menor que 450, valor vazio ou não houver informação, obrigatório fiador e documentos do fiador.
```

- [ ] **Step 7: Update extraction-detail labels**

In `src/components/extraction-detail.tsx`, replace the old labels:
```
OLD:
  nome_titular: "Nome do Titular",
  ...
  cpf_titular: "CPF do Titular",

NEW:
  titulares: "Titulares",
```

- [ ] **Step 8: Run full test suite**

Run: `npm test`
Expected: All tests pass. Check `contractOrchestrator.test.ts` — if it has mocks for fluxo output with `nome_titular`/`cpf_titular`, update them to use `titulares: [{ nome, cpf, score }]`.

- [ ] **Step 9: Commit**

```bash
git add src/ai/agents/fluxo-agent/schema.ts src/ai/agents/fluxo-agent/prompt.ts src/ai/agents/validation-agent/prompt.ts src/components/extraction-detail.tsx src/__tests__/ai/agents/fluxo-agent/schema.test.ts
git commit -m "feat: support multiple buyers in fluxo agent

Replace nome_titular/cpf_titular/score with titulares[] array.
Each titular has nome, cpf, score. Bump schema_version 2.0 → 3.0.
Update validation prompt to use max score across titulares."
```

---

## Task 3: PDF digital dual-mode — Downloader + Mapper

**Files:**
- Modify: `src/lib/cvcrm/documentDownloader.ts:139-143`
- Modify: `src/ai/orchestrator/agentDocumentMapper.ts:76-99`
- Create: `src/__tests__/ai/orchestrator/agentDocumentMapper.test.ts`

- [ ] **Step 1: Write the failing tests for buildAgentInput**

```typescript
// src/__tests__/ai/orchestrator/agentDocumentMapper.test.ts
import { buildAgentInput } from "@/ai/orchestrator/agentDocumentMapper";
import type { DocumentContent } from "@/lib/cvcrm/documentDownloader";

function makeTextDoc(overrides: Partial<DocumentContent> = {}): DocumentContent {
  return {
    documentId: 1,
    nome: "CNH_Digital.pdf",
    tipo: "CNH",
    contentType: "text",
    text: "NOME: João Silva\nCPF: 12345678900",
    link: "https://example.com/cnh.pdf",
    ...overrides,
  };
}

function makeTextDocWithPdf(overrides: Partial<DocumentContent> = {}): DocumentContent {
  return {
    ...makeTextDoc(),
    imageData: Buffer.from("fake-pdf-content"),
    imageMimeType: "application/pdf",
    ...overrides,
  };
}

function makeImageDoc(overrides: Partial<DocumentContent> = {}): DocumentContent {
  return {
    documentId: 2,
    nome: "RG_Scan.jpg",
    tipo: "RG Principal",
    contentType: "image",
    imageData: Buffer.from("fake-image"),
    imageMimeType: "image/jpeg",
    link: "https://example.com/rg.jpg",
    ...overrides,
  };
}

describe("buildAgentInput", () => {
  const context = '{"reservaId": 123}';

  describe("text document with PDF buffer (digital PDF)", () => {
    it("includes both text content and PDF file part", () => {
      const input = buildAgentInput([makeTextDocWithPdf()], context);

      expect(input.text).toContain("NOME: João Silva");
      expect(input.text).toContain("PDF DIGITAL");
      expect(input.files).toBeDefined();
      expect(input.files).toHaveLength(1);
      expect(input.files![0].mimeType).toBe("application/pdf");
    });
  });

  describe("text document without PDF buffer (fallback/legacy)", () => {
    it("includes only text content, no file parts", () => {
      const input = buildAgentInput([makeTextDoc()], context);

      expect(input.text).toContain("NOME: João Silva");
      expect(input.text).toContain("DOCUMENTO:");
      expect(input.text).not.toContain("PDF DIGITAL");
      expect(input.files).toBeUndefined();
    });
  });

  describe("image document (scanned PDF or photo)", () => {
    it("includes image parts, not file parts", () => {
      const input = buildAgentInput([makeImageDoc()], context);

      expect(input.images).toBeDefined();
      expect(input.images).toHaveLength(1);
      expect(input.files).toBeUndefined();
    });
  });

  describe("mixed documents", () => {
    it("handles text+pdf and image docs together", () => {
      const input = buildAgentInput([makeTextDocWithPdf(), makeImageDoc()], context);

      expect(input.text).toContain("NOME: João Silva");
      expect(input.files).toHaveLength(1);
      expect(input.images).toHaveLength(1);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/__tests__/ai/orchestrator/agentDocumentMapper.test.ts`
Expected: FAIL — "PDF DIGITAL" not found in text, files is undefined for text docs with imageData

- [ ] **Step 3: Update documentDownloader to preserve buffer**

In `src/lib/cvcrm/documentDownloader.ts`, replace lines 139-143:

```
OLD:
    return {
      ...base,
      contentType: "text",
      text,
    };

NEW:
    return {
      ...base,
      contentType: "text",
      text,
      imageData: buffer,
      imageMimeType: "application/pdf",
    };
```

- [ ] **Step 4: Update buildAgentInput to send both text and PDF**

In `src/ai/orchestrator/agentDocumentMapper.ts`, replace the text document branch (lines 76-81):

```
OLD:
    if (doc.contentType === "text" && doc.text) {
      textParts.push(
        `=== DOCUMENTO: ${doc.nome} (${doc.tipo}) ===`,
        doc.text,
        "",
      );

NEW:
    if (doc.contentType === "text" && doc.text) {
      const hasPdf = doc.imageData && doc.imageMimeType === "application/pdf";
      textParts.push(
        `=== DOCUMENTO${hasPdf ? " (PDF DIGITAL)" : ""}: ${doc.nome} (${doc.tipo}) ===`,
        doc.text,
        "",
      );

      if (hasPdf) {
        files.push({ data: doc.imageData, mimeType: "application/pdf" });
      }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- src/__tests__/ai/orchestrator/agentDocumentMapper.test.ts`
Expected: PASS — all 4 describe blocks green

- [ ] **Step 6: Run full test suite**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add src/lib/cvcrm/documentDownloader.ts src/ai/orchestrator/agentDocumentMapper.ts src/__tests__/ai/orchestrator/agentDocumentMapper.test.ts
git commit -m "feat: send both text and visual PDF for digital documents

Digital PDFs now preserve the original buffer alongside extracted text.
buildAgentInput sends both to the LLM for maximum extraction accuracy,
especially for identity documents (CNH, RG, certidões)."
```

---

## Task 4: Validation people array — Schema

**Files:**
- Modify: `src/ai/agents/validation-agent/schema.ts`
- Create: `src/__tests__/ai/agents/validation-agent/schema.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/__tests__/ai/agents/validation-agent/schema.test.ts
import { validationSchema } from "@/ai/agents/validation-agent/schema";

function makeValidOutput() {
  return {
    dados_imovel: {
      nome_empreendimento: { status: "Igual", detalhes: "" },
      unidade_bloco: { status: "Igual", detalhes: "" },
    },
    financeiro: {
      valor_venda_total: { status: "Igual", detalhes: "" },
      financiamento: { status: "Igual", detalhes: "" },
      subsidio: { status: "Igual", detalhes: "" },
      parcelas_mensais: { status: "Igual", detalhes: "" },
      chaves: { status: "Igual", detalhes: "" },
      pos_chaves: { status: "Igual", detalhes: "" },
    },
    Termo: { status: "Igual", detalhes: "" },
    pessoas: [
      { papel: "titular", status: "Igual", detalhes: "" },
    ],
    validacao_endereco: { status: "Igual", detalhes: "" },
    Documentos: { status: "Igual", detalhes: "" },
  };
}

describe("validationSchema", () => {
  describe("pessoas array", () => {
    it("accepts array with one pessoa", () => {
      const result = validationSchema.safeParse(makeValidOutput());
      expect(result.success).toBe(true);
    });

    it("accepts array with multiple pessoas", () => {
      const data = makeValidOutput();
      data.pessoas = [
        { papel: "titular", status: "Igual", detalhes: "" },
        { papel: "conjuge", status: "Divergente", detalhes: "CPF divergente" },
      ];
      const result = validationSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pessoas).toHaveLength(2);
      }
    });

    it("accepts empty pessoas array", () => {
      const data = makeValidOutput();
      data.pessoas = [];
      const result = validationSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("requires papel, status, detalhes per pessoa", () => {
      const data = makeValidOutput();
      data.pessoas = [{ papel: "titular" } as never];
      const result = validationSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("validacao_endereco at root level", () => {
    it("accepts validacao_endereco as sibling of dados_imovel", () => {
      const result = validationSchema.safeParse(makeValidOutput());
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.validacao_endereco).toEqual({ status: "Igual", detalhes: "" });
      }
    });
  });

  describe("rejects old format", () => {
    it("rejects pessoas as object with titular/conjuge/comprador keys", () => {
      const data = {
        ...makeValidOutput(),
        pessoas: {
          titular: { status: "Igual", detalhes: "" },
          conjuge: { status: "Igual", detalhes: "" },
          comprador: { status: "Igual", detalhes: "" },
          validacao_endereco: { status: "Igual", detalhes: "" },
        },
      };
      const result = validationSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/__tests__/ai/agents/validation-agent/schema.test.ts`
Expected: FAIL — pessoas expects object, validacao_endereco is inside pessoas

- [ ] **Step 3: Update the schema**

Replace `src/ai/agents/validation-agent/schema.ts` entirely:

```typescript
import { z } from "zod";

const statusField = z.object({
  status: z.enum(["Igual", "Divergente", "Ignorado"]),
  detalhes: z.string(),
});

const pessoaField = z.object({
  papel: z.string(),
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
  pessoas: z.array(pessoaField),
  validacao_endereco: statusField,
  Documentos: statusField,
});

export type ValidationOutput = z.infer<typeof validationSchema>;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/__tests__/ai/agents/validation-agent/schema.test.ts`
Expected: PASS — all 6 tests green

- [ ] **Step 5: Commit**

```bash
git add src/ai/agents/validation-agent/schema.ts src/__tests__/ai/agents/validation-agent/schema.test.ts
git commit -m "feat: change validation pessoas from fixed object to dynamic array

pessoas is now z.array({papel, status, detalhes}) instead of fixed
titular/conjuge/comprador keys. validacao_endereco moved to root level.
Only people with analyzed documents will be included."
```

---

## Task 5: Validation people array — Prompt

**Files:**
- Modify: `src/ai/agents/validation-agent/prompt.ts`

- [ ] **Step 1: Update the prompt**

In `src/ai/agents/validation-agent/prompt.ts`, make these changes:

**Replace section "4. REGRAS PARA PESSOAS" (around line 70):**

```
OLD:
4. REGRAS PARA PESSOAS
Ocupação e Renda: Status "Ignorado". Detalhes: "".

Estado Civil/Certidão de nascimento: Ignore comparação do estado civil. Se houver alteracao_de_nome no documento e o Quadro estiver desatualizado -> Status: "Divergente".

Nome: Valide grafia. Caso exista nome social, ele também pode ser usado.

NEW:
4. REGRAS PARA PESSOAS
REGRA CRÍTICA: No array "pessoas", inclua APENAS pessoas cujos documentos foram extraídos e estão presentes em "dados_extraidos". Se um perfil (ex: cônjuge) é mencionado no Quadro Resumo mas NÃO teve documentos lidos, NÃO o inclua no array. Consulte o campo "pessoas_com_documentos" no input para saber quais perfis tiveram documentos analisados.

Para cada pessoa incluída no array, use o campo "papel" com um destes valores: "titular", "conjuge", "comprador", "fiador".

Ocupação e Renda: Status "Ignorado". Detalhes: "".

Estado Civil/Certidão de nascimento: Ignore comparação do estado civil. Se houver alteracao_de_nome no documento e o Quadro estiver desatualizado -> Status: "Divergente".

Nome: Valide grafia. Caso exista nome social, ele também pode ser usado.
```

**Replace section "5. DOCUMENTOS E FIADOR" score rule (around line 78):**

The existing score rule already handles multi-buyer (unchanged from Task 2). Keep it as updated in Task 2.

**Replace the checklist instruction (around line 86):**

```
OLD:
O modelo DEVE analisar separadamente cada perfil listado na entrada (ex: "titular", "conjuge", "comprador", "fiador").

Para CADA PERFIL existente no JSON, verifique rigorosamente se a seguinte lista de documentos está presente:

NEW:
O modelo DEVE analisar separadamente SOMENTE os perfis listados em "pessoas_com_documentos". NÃO analise perfis que não estejam nesta lista.

Para CADA PERFIL com documentos, verifique rigorosamente se a seguinte lista de documentos está presente:
```

**Replace the JSON example (lines 130-145):**

```
OLD:
  "pessoas": {
    "titular": { "status": "", "detalhes": "" },
    "conjuge": { "status": "", "detalhes": "" },
    "comprador": { "status": "", "detalhes": "" },
    "validacao_endereco": {
        "status": "",
        "detalhes": ""
    }
  },

NEW:
  "pessoas": [
    { "papel": "titular", "status": "", "detalhes": "" }
  ],

  "validacao_endereco": { "status": "", "detalhes": "" },
```

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: All tests pass (prompt is a string, no runtime validation on it)

- [ ] **Step 3: Commit**

```bash
git add src/ai/agents/validation-agent/prompt.ts
git commit -m "feat: update validation prompt for dynamic pessoas array

Instruct LLM to only include people with analyzed documents.
Add pessoas_com_documentos reference. Update JSON example to array
format with papel field. Move validacao_endereco to root level."
```

---

## Task 6: Validation people array — Orchestrator metadata

**Files:**
- Modify: `src/ai/orchestrator/contractOrchestrator.ts:190-214`

- [ ] **Step 1: Update runCrossValidation to include people metadata**

In `src/ai/orchestrator/contractOrchestrator.ts`, find `runCrossValidation()` and update the `validationInput` construction:

```
OLD:
  const validationInput = {
    dados_extraidos: consolidatedData,
    comparacao_financeira: financialComparison,
    validacao_planta: plantaValidation,
  };

NEW:
  // Determine which person roles had documents analyzed
  const personAgents: AgentName[] = [
    "rgcpf-agent", "cnh-agent", "comprovante-residencia-agent",
    "declaracao-residencia-agent", "certidao-estado-civil-agent",
    "comprovante-renda-agent", "carteira-trabalho-agent", "carta-fiador-agent",
  ];
  const analyzedAgents = extractionResults
    .filter((r) => r.ok && personAgents.includes(r.agent))
    .map((r) => r.agent);

  const pessoasComDocumentos = new Set<string>();
  // If any person-related agent succeeded, at least titular has docs
  if (analyzedAgents.length > 0) pessoasComDocumentos.add("titular");
  // If carta-fiador succeeded, fiador has docs
  if (analyzedAgents.includes("carta-fiador-agent")) pessoasComDocumentos.add("fiador");

  const validationInput = {
    dados_extraidos: consolidatedData,
    comparacao_financeira: financialComparison,
    validacao_planta: plantaValidation,
    pessoas_com_documentos: Array.from(pessoasComDocumentos),
  };
```

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: All pass. If `contractOrchestrator.test.ts` has assertions on the validationInput shape, update them to include `pessoas_com_documentos`.

- [ ] **Step 3: Commit**

```bash
git add src/ai/orchestrator/contractOrchestrator.ts
git commit -m "feat: pass pessoas_com_documentos metadata to validation agent

Derive which person roles had documents analyzed from extraction
results. Pass as metadata so validation agent only reports on
people with actual documents."
```

---

## Task 7: Validation people array — Report Formatter

**Files:**
- Modify: `src/ai/validation/report-formatter.ts`

- [ ] **Step 1: Write failing test for array-based pessoas**

Add to existing test file or create:

```typescript
// src/__tests__/ai/validation/report-formatter.test.ts
import { formatValidationReport } from "@/ai/validation/report-formatter";
import type { ValidationOutput } from "@/ai/agents/validation-agent/schema";

function makeAllIgual(): ValidationOutput {
  return {
    dados_imovel: {
      nome_empreendimento: { status: "Igual", detalhes: "" },
      unidade_bloco: { status: "Igual", detalhes: "" },
    },
    financeiro: {
      valor_venda_total: { status: "Igual", detalhes: "" },
      financiamento: { status: "Igual", detalhes: "" },
      subsidio: { status: "Igual", detalhes: "" },
      parcelas_mensais: { status: "Igual", detalhes: "" },
      chaves: { status: "Igual", detalhes: "" },
      pos_chaves: { status: "Igual", detalhes: "" },
    },
    Termo: { status: "Igual", detalhes: "" },
    pessoas: [],
    validacao_endereco: { status: "Igual", detalhes: "" },
    Documentos: { status: "Igual", detalhes: "" },
  };
}

describe("formatValidationReport", () => {
  it("returns no divergences for all-Igual output", () => {
    const result = formatValidationReport(makeAllIgual());
    expect(result).toBe("Nenhuma divergência encontrada");
  });

  it("includes divergent pessoa from array", () => {
    const data = makeAllIgual();
    data.pessoas = [
      { papel: "titular", status: "Divergente", detalhes: "CPF divergente" },
    ];
    const result = formatValidationReport(data);
    expect(result).toContain("Titular");
    expect(result).toContain("CPF divergente");
  });

  it("excludes Igual pessoa from report", () => {
    const data = makeAllIgual();
    data.pessoas = [
      { papel: "titular", status: "Igual", detalhes: "" },
      { papel: "conjuge", status: "Divergente", detalhes: "RG faltando" },
    ];
    const result = formatValidationReport(data);
    expect(result).not.toContain("Titular");
    expect(result).toContain("Conjuge");
    expect(result).toContain("RG faltando");
  });

  it("handles empty pessoas array", () => {
    const data = makeAllIgual();
    data.pessoas = [];
    const result = formatValidationReport(data);
    expect(result).toBe("Nenhuma divergência encontrada");
  });

  it("includes divergent validacao_endereco at root level", () => {
    const data = makeAllIgual();
    data.validacao_endereco = { status: "Divergente", detalhes: "Endereço diferente" };
    const result = formatValidationReport(data);
    expect(result).toContain("Validacao Endereco");
    expect(result).toContain("Endereço diferente");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/__tests__/ai/validation/report-formatter.test.ts`
Expected: FAIL — TypeScript errors because ValidationOutput type changed, formatter doesn't handle arrays

- [ ] **Step 3: Update the formatter**

Replace `src/ai/validation/report-formatter.ts` entirely:

```typescript
import type { ValidationOutput } from "@/ai/agents/validation-agent/schema";

function formatarData(texto: string): string {
  return texto.replace(/(\d{4})-(\d{2})-(\d{2})/g, "$3-$2-$1");
}

function formatKey(key: string): string {
  let formatted = key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
  formatted = formatted.replace(/ Da\b/g, " da").replace(/ De\b/g, " de");
  return formatted;
}

type StatusEntry = {
  status: string;
  detalhes: string;
};

function collectDivergentItems(
  obj: Record<string, unknown>,
  items: { key: string; status: string; detalhes: string }[]
): void {
  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
    const current = obj[key];

    // Handle pessoas array
    if (key === "pessoas" && Array.isArray(current)) {
      for (const pessoa of current) {
        if (
          pessoa &&
          typeof pessoa === "object" &&
          "status" in pessoa &&
          "papel" in pessoa
        ) {
          const entry = pessoa as { papel: string; status: string; detalhes: string };
          if (entry.status !== "Igual" && entry.status !== "Ignorado") {
            items.push({
              key: entry.papel,
              status: entry.status,
              detalhes: entry.detalhes,
            });
          }
        }
      }
      continue;
    }

    if (current && typeof current === "object" && !Array.isArray(current)) {
      const record = current as Record<string, unknown>;
      if ("status" in record && typeof record.status === "string") {
        const entry = record as unknown as StatusEntry;
        if (entry.status !== "Igual" && entry.status !== "Ignorado") {
          items.push({
            key,
            status: entry.status,
            detalhes: entry.detalhes,
          });
        }
      } else {
        collectDivergentItems(record, items);
      }
    }
  }
}

export function formatValidationReport(
  validation: ValidationOutput
): string {
  const items: { key: string; status: string; detalhes: string }[] = [];
  collectDivergentItems(
    validation as unknown as Record<string, unknown>,
    items
  );

  if (items.length === 0) {
    return "Nenhuma divergência encontrada";
  }

  const parts: string[] = [];

  for (const item of items) {
    const formattedKey = formatKey(item.key);
    const formattedStatus = formatarData(item.status);
    let line = `**${formattedKey}**: ${formattedStatus}`;
    if (item.detalhes) {
      const formattedDetails = formatarData(item.detalhes);
      line += `\n- Detalhes: ${formattedDetails}`;
    }
    parts.push(line);
  }

  return parts.join("\n\n");
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/__tests__/ai/validation/report-formatter.test.ts`
Expected: PASS — all 5 tests green

- [ ] **Step 5: Run full test suite**

Run: `npm test`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
git add src/ai/validation/report-formatter.ts src/__tests__/ai/validation/report-formatter.test.ts
git commit -m "feat: update report formatter for pessoas array format

collectDivergentItems now handles pessoas as array, using papel as
the display key. Existing object-based collection unchanged for
other sections."
```

---

## Task 8: Validation people array — UI Component

**Files:**
- Modify: `src/components/validation-report.tsx`

- [ ] **Step 1: Update ValidationData type**

In `src/components/validation-report.tsx`, replace the type definition (lines 24-45):

```
OLD:
type ValidationData = {
  dados_imovel?: {
    nome_empreendimento?: StatusField;
    unidade_bloco?: StatusField;
  };
  financeiro?: {
    valor_venda_total?: StatusField;
    financiamento?: StatusField;
    subsidio?: StatusField;
    parcelas_mensais?: StatusField;
    chaves?: StatusField;
    pos_chaves?: StatusField;
  };
  Termo?: StatusField;
  pessoas?: {
    titular?: StatusField;
    conjuge?: StatusField;
    comprador?: StatusField;
    validacao_endereco?: StatusField;
  };
  Documentos?: StatusField;
};

NEW:
type PessoaField = {
  papel: string;
  status: StatusValue;
  detalhes: string;
};

type ValidationData = {
  dados_imovel?: {
    nome_empreendimento?: StatusField;
    unidade_bloco?: StatusField;
  };
  financeiro?: {
    valor_venda_total?: StatusField;
    financiamento?: StatusField;
    subsidio?: StatusField;
    parcelas_mensais?: StatusField;
    chaves?: StatusField;
    pos_chaves?: StatusField;
  };
  Termo?: StatusField;
  pessoas?: PessoaField[];
  validacao_endereco?: StatusField;
  Documentos?: StatusField;
};
```

- [ ] **Step 2: Update FIELD_LABELS**

```
OLD:
  titular: "Titular",
  conjuge: "Cônjuge",
  comprador: "Comprador",
  validacao_endereco: "Endereço",

NEW:
  validacao_endereco: "Endereço",
```

Remove `titular`, `conjuge`, `comprador` from `FIELD_LABELS` (they're now dynamic via `papel`).

- [ ] **Step 3: Add helper function for pessoas fields**

Add this function after `resolveFields()`:

```typescript
const PAPEL_LABELS: Record<string, string> = {
  titular: "Titular",
  conjuge: "Cônjuge",
  comprador: "Comprador",
  fiador: "Fiador",
};

function resolvePessoasFields(pessoas: PessoaField[] | undefined): { label: string; field: StatusField }[] {
  if (!pessoas || !Array.isArray(pessoas)) return [];
  return pessoas.map((p) => ({
    label: PAPEL_LABELS[p.papel] ?? p.papel.replace(/\b\w/g, (c) => c.toUpperCase()),
    field: { status: p.status, detalhes: p.detalhes },
  }));
}
```

- [ ] **Step 4: Update SummaryBar to handle array**

In the `countFields` function inside `SummaryBar`, add array handling:

```
OLD:
    for (const val of Object.values(obj)) {
      if (val && typeof val === "object" && "status" in val) {

NEW:
    for (const val of Object.values(obj)) {
      if (Array.isArray(val)) {
        for (const item of val) {
          if (item && typeof item === "object" && "status" in item) {
            const f = item as StatusField;
            total++;
            if (f.status === "Igual") igual++;
            else if (f.status === "Divergente") divergente++;
            else if (f.status === "Ignorado") ignorado++;
          }
        }
        continue;
      }
      if (val && typeof val === "object" && "status" in val) {
```

- [ ] **Step 5: Update rendering section**

Replace the pessoas rendering in `ValidationReport` component:

```
OLD:
  const pessoasFields = resolveFields(validation.pessoas as Record<string, unknown>);

NEW:
  const pessoasFields = resolvePessoasFields(validation.pessoas);
  const enderecoField = validation.validacao_endereco;
```

Add the endereço section after the Pessoas section and before Documentos:

```typescript
        {enderecoField && (
          <ValidationSection
            title="Endereço"
            icon={<Building2 className="h-4 w-4" strokeWidth={1.75} />}
            fields={[{ label: "Validação de Endereço", field: enderecoField }]}
          />
        )}
```

- [ ] **Step 6: Run build to check for type errors**

Run: `npm run build`
Expected: No TypeScript errors

- [ ] **Step 7: Commit**

```bash
git add src/components/validation-report.tsx
git commit -m "feat: update validation report UI for dynamic pessoas array

Replace fixed titular/conjuge/comprador fields with dynamic array
rendering using papel as label. Move validacao_endereco to its own
section. Update SummaryBar to count array items."
```

---

## Task 9: Final integration verification

**Files:** None (verification only)

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: No new lint errors

- [ ] **Step 4: Verify existing orchestrator tests**

Run: `npm test -- src/__tests__/ai/orchestrator/contractOrchestrator.test.ts`

If this test has mocks with the old validation output format (pessoas as object), update the mock data:

```
OLD mock:
pessoas: {
  titular: { status: "Igual", detalhes: "" },
  conjuge: { status: "Igual", detalhes: "" },
  comprador: { status: "Igual", detalhes: "" },
  validacao_endereco: { status: "Igual", detalhes: "" },
}

NEW mock:
pessoas: [
  { papel: "titular", status: "Igual", detalhes: "" },
],
validacao_endereco: { status: "Igual", detalhes: "" },
```

Similarly, if fluxo mocks use `nome_titular`/`cpf_titular`, update to `titulares` array format.

- [ ] **Step 5: Commit any test fixes**

```bash
git add -u
git commit -m "fix: update existing test mocks for new schema formats"
```
