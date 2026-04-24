# Editable Extraction Prompts — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin edita os 14 prompts de extração (BASE_PROMPT + 13 agentes) pela UI, com versionamento completo, rollback, e fluxo rascunho → teste contra reserva real → publicar.

**Architecture:** Nova tabela `prompt_configs` com versionamento (is_active/is_default + índices parciais). Runtime carrega snapshot imutável uma vez por `analyzeContract()`. Admin-only UI em `/admin/prompts` com editor, histórico, diff visual antes de publicar, e painel de teste que roda 1 agente com prompt-rascunho contra `idReserva` real. Auth via novo enum `user_role` (`admin` | `auditor`) na tabela `users`.

**Tech Stack:** Next.js 16 (App Router, RSC), Drizzle ORM + Postgres, TypeScript strict, Jest + ts-jest, Tailwind 4 + shadcn/ui, Vercel AI SDK, lib `diff` (nova dependência).

**Spec:** `docs/superpowers/specs/2026-04-24-editable-extraction-prompts-design.md`

---

## File Structure

### Create

| File | Responsibility |
|---|---|
| `src/lib/prompt-keys.ts` | Lista canônica de keys válidas (`extraction-base` + 13 agentes) e set de keys críticas (`quadro-resumo-agent`, `fluxo-agent`) |
| `src/ai/_base/prompt-defaults.ts` | Record com os 14 prompts hardcoded (consolidação de `basePrompt.ts` + `agents/*/prompt.ts`) — usado como seed e fallback |
| `src/ai/_base/loadPrompt.ts` | `loadPrompt(key)` + `snapshotPrompts()` — runtime loader com fallback hardcoded |
| `src/db/queries/prompt-configs.ts` | Queries: `listPromptConfigs()`, `getPromptByKey()`, `createDraft()`, `activateVersion()` |
| `src/lib/auth/requireAdmin.ts` | Helper server-side pra guardar rotas admin |
| `scripts/seed-prompt-configs.ts` | Script TS via `tsx` que insere as 14 rows a partir de `prompt-defaults.ts` |
| `src/app/api/admin/prompts/route.ts` | GET list |
| `src/app/api/admin/prompts/[key]/route.ts` | GET one + POST draft |
| `src/app/api/admin/prompts/[key]/activate/route.ts` | POST activate |
| `src/app/api/admin/prompts/[key]/test/route.ts` | POST test |
| `src/app/(private)/admin/layout.tsx` | Guard com `requireAdmin()` |
| `src/app/(private)/admin/prompts/page.tsx` | Lista (RSC) |
| `src/app/(private)/admin/prompts/[key]/page.tsx` | Server shell que carrega histórico + conteúdo ativo |
| `src/app/(private)/admin/prompts/[key]/editor.tsx` | Client component do editor principal |
| `src/app/(private)/admin/prompts/[key]/history-sidebar.tsx` | Client component da timeline de versões |
| `src/app/(private)/admin/prompts/[key]/diff-modal.tsx` | Client component do modal de confirmação com diff |
| `src/app/(private)/admin/prompts/[key]/test-panel.tsx` | Client component do painel de teste |

### Modify

| File | Change |
|---|---|
| `src/db/schema.ts` | Adicionar `userRoleEnum`, coluna `role` em `usersTable`, tabela `promptConfigsTable` + índices parciais |
| `src/lib/auth/session.ts` | `User` já inclui `role` via Drizzle $inferSelect após schema update — não precisa mudar |
| `src/ai/_base/types.ts` | Adicionar `promptOverride?: { content: string; version: string }` em `AgentRunOptions` |
| `src/ai/_base/runAgent.ts` | Aceitar `promptVersion` no args, gravar no `AgentResult` |
| `src/ai/agents/*/agent.ts` (13 arquivos) | Ler `options.promptOverride` e passar pra `runAgent`; fallback pra constante hardcoded |
| `src/ai/orchestrator/contractOrchestrator.ts` | `analyzeContract()` chama `snapshotPrompts()` 1x e passa override pros 13 agentes (+ validation-agent fica com default por ora) |
| `src/components/layout/app-sidebar.tsx` | Adicionar item "Prompts" condicional a `user.role === 'admin'` |
| `src/app/(private)/layout.tsx` | Passar `role` pro sidebar |
| `package.json` | Adicionar `diff` dep |

### Tests (all under `src/__tests__/`)

- `db/promptConfigs.schema.test.ts`
- `db/queries/promptConfigs.test.ts`
- `lib/auth/requireAdmin.test.ts`
- `ai/_base/loadPrompt.test.ts`
- `ai/_base/snapshotPrompts.test.ts`
- `ai/_base/runAgent.promptVersion.test.ts` (adições ao arquivo ou novo)
- `ai/orchestrator/snapshot.test.ts`
- `api/admin/prompts/list.test.ts`
- `api/admin/prompts/key.test.ts`
- `api/admin/prompts/activate.test.ts`
- `api/admin/prompts/test.test.ts`

---

## Phase A — Schema foundation

### Task 1: Add `user_role` enum + `role` column + admin seed

**Files:**
- Modify: `src/db/schema.ts`
- Create: `drizzle/NNNN_*.sql` (via `npm run db:generate`)
- Create: `scripts/seed-admin-role.ts`
- Test: `src/__tests__/db/userRole.schema.test.ts`

- [ ] **Step 1: Write schema change in `src/db/schema.ts`**

Adicione após o `reservationStatusEnum` existente:

```ts
export const userRoleEnum = pgEnum("user_role", ["admin", "auditor"]);
```

Modifique `usersTable` adicionando a coluna `role`:

```ts
export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  email: varchar({ length: 255 }).notNull().unique(),
  password: varchar({ length: 255 }).notNull(),
  name: varchar({ length: 255 }),
  role: userRoleEnum("role").notNull().default("auditor"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});
```

- [ ] **Step 2: Generate the Drizzle migration**

Run: `npm run db:generate`
Expected: um novo arquivo em `drizzle/NNNN_*.sql` é criado contendo `CREATE TYPE user_role ...` + `ALTER TABLE users ADD COLUMN role ...`.

Inspecione o SQL gerado pra confirmar.

- [ ] **Step 3: Create the seed script**

Create `scripts/seed-admin-role.ts`:

```ts
import { db } from "@/db";
import { usersTable } from "@/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const email = "dadasjv@hotmail.com";
  const result = await db
    .update(usersTable)
    .set({ role: "admin" })
    .where(eq(usersTable.email, email))
    .returning({ id: usersTable.id, email: usersTable.email, role: usersTable.role });

  if (result.length === 0) {
    console.error(`No user found with email ${email} — create the user first via /register`);
    process.exit(1);
  }
  console.log("promoted:", result[0]);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 4: Write the schema test**

Create `src/__tests__/db/userRole.schema.test.ts`:

```ts
import { userRoleEnum, usersTable } from "@/db/schema";

describe("user role schema", () => {
  it("exposes enum with admin and auditor values", () => {
    expect(userRoleEnum.enumValues).toEqual(["admin", "auditor"]);
  });

  it("users table has role column with default auditor", () => {
    const role = usersTable.role;
    expect(role).toBeDefined();
    expect(role.notNull).toBe(true);
  });
});
```

- [ ] **Step 5: Apply migration to dev DB + run tests**

Run: `npm run db:push` (dev schema push) and then `npm test -- userRole.schema`.
Expected: tests PASS. Table now has `role` column.

- [ ] **Step 6: Seed the admin user**

Run: `npx tsx scripts/seed-admin-role.ts`
Expected: `promoted: { id: ..., email: "dadasjv@hotmail.com", role: "admin" }`

- [ ] **Step 7: Commit**

```bash
git add src/db/schema.ts drizzle/ scripts/seed-admin-role.ts src/__tests__/db/userRole.schema.test.ts
git commit -m "feat(db): add user_role enum and role column"
```

---

### Task 2: Add `prompt_configs` table schema

**Files:**
- Modify: `src/db/schema.ts`
- Create: `drizzle/NNNN_*.sql` (generated)
- Test: `src/__tests__/db/promptConfigs.schema.test.ts`

- [ ] **Step 1: Add the table to `src/db/schema.ts`**

Adicione depois de `ruleConfigsTable`:

```ts
export const promptConfigsTable = pgTable(
  "prompt_configs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agent: varchar("agent", { length: 64 }).notNull(),
    version: integer("version").notNull(),
    isActive: boolean("is_active").notNull().default(false),
    isDefault: boolean("is_default").notNull().default(false),
    content: text("content").notNull(),
    notes: text("notes"),
    createdBy: integer("created_by")
      .notNull()
      .references(() => usersTable.id, { onDelete: "restrict" }),
    activatedBy: integer("activated_by").references(() => usersTable.id, {
      onDelete: "restrict",
    }),
    activatedAt: timestamp("activated_at", { mode: "date" }),
    deactivatedAt: timestamp("deactivated_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    agentVersionUnique: index("prompt_configs_agent_version_idx").on(
      table.agent,
      table.version,
    ),
    agentIdx: index("prompt_configs_agent_idx").on(table.agent),
  })
);

export type PromptConfig = typeof promptConfigsTable.$inferSelect;
export type NewPromptConfig = typeof promptConfigsTable.$inferInsert;
```

- [ ] **Step 2: Generate the Drizzle migration**

Run: `npm run db:generate`

Abra o SQL gerado e adicione manualmente estas duas linhas ao fim dele (Drizzle não gera índice parcial automaticamente):

```sql
CREATE UNIQUE INDEX prompt_configs_agent_active_key ON prompt_configs(agent) WHERE is_active = true;
CREATE UNIQUE INDEX prompt_configs_agent_default_key ON prompt_configs(agent) WHERE is_default = true;
CREATE UNIQUE INDEX prompt_configs_agent_version_unique_key ON prompt_configs(agent, version);
```

- [ ] **Step 3: Write the schema test**

Create `src/__tests__/db/promptConfigs.schema.test.ts`:

```ts
import { promptConfigsTable } from "@/db/schema";

describe("prompt_configs schema", () => {
  it("has required columns", () => {
    const cols = Object.keys(promptConfigsTable);
    ["agent", "version", "isActive", "isDefault", "content", "createdBy", "activatedBy", "activatedAt", "deactivatedAt"].forEach(
      (name) => expect(cols).toContain(name),
    );
  });
});
```

- [ ] **Step 4: Apply migration + run tests**

Run: `npm run db:push`
Run: `npm test -- promptConfigs.schema`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/db/schema.ts drizzle/ src/__tests__/db/promptConfigs.schema.test.ts
git commit -m "feat(db): add prompt_configs table with versioning"
```

---

## Phase B — Constants & defaults

### Task 3: Central keys and defaults

**Files:**
- Create: `src/lib/prompt-keys.ts`
- Create: `src/ai/_base/prompt-defaults.ts`
- Test: `src/__tests__/lib/promptKeys.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/lib/promptKeys.test.ts`:

```ts
import { PROMPT_KEYS, CRITICAL_PROMPT_KEYS, isPromptKey } from "@/lib/prompt-keys";

describe("prompt-keys", () => {
  it("lists 14 keys: extraction-base + 13 extraction agents", () => {
    expect(PROMPT_KEYS).toHaveLength(14);
    expect(PROMPT_KEYS).toContain("extraction-base");
    expect(PROMPT_KEYS).toContain("cnh-agent");
    expect(PROMPT_KEYS).not.toContain("validation-agent");
  });

  it("marks quadro-resumo-agent and fluxo-agent as critical", () => {
    expect(CRITICAL_PROMPT_KEYS.has("quadro-resumo-agent")).toBe(true);
    expect(CRITICAL_PROMPT_KEYS.has("fluxo-agent")).toBe(true);
    expect(CRITICAL_PROMPT_KEYS.has("cnh-agent")).toBe(false);
  });

  it("isPromptKey type guard accepts valid keys", () => {
    expect(isPromptKey("cnh-agent")).toBe(true);
    expect(isPromptKey("validation-agent")).toBe(false);
    expect(isPromptKey("random")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- promptKeys`
Expected: FAIL `Cannot find module '@/lib/prompt-keys'`.

- [ ] **Step 3: Create `src/lib/prompt-keys.ts`**

```ts
export const PROMPT_KEYS = [
  "extraction-base",
  "cnh-agent",
  "rgcpf-agent",
  "ato-agent",
  "quadro-resumo-agent",
  "fluxo-agent",
  "planta-agent",
  "comprovante-residencia-agent",
  "declaracao-residencia-agent",
  "certidao-estado-civil-agent",
  "termo-agent",
  "carteira-trabalho-agent",
  "comprovante-renda-agent",
  "carta-fiador-agent",
] as const;

export type PromptKey = (typeof PROMPT_KEYS)[number];

export const CRITICAL_PROMPT_KEYS: ReadonlySet<PromptKey> = new Set([
  "quadro-resumo-agent",
  "fluxo-agent",
]);

export function isPromptKey(x: string): x is PromptKey {
  return (PROMPT_KEYS as readonly string[]).includes(x);
}

export const PROMPT_KEY_LABELS: Record<PromptKey, string> = {
  "extraction-base": "Prompt Principal (base de extração)",
  "cnh-agent": "CNH",
  "rgcpf-agent": "RG / CPF",
  "ato-agent": "Ato de Reserva",
  "quadro-resumo-agent": "Quadro Resumo",
  "fluxo-agent": "Fluxo Financeiro",
  "planta-agent": "Planta",
  "comprovante-residencia-agent": "Comprovante de Residência",
  "declaracao-residencia-agent": "Declaração de Residência",
  "certidao-estado-civil-agent": "Certidão de Estado Civil",
  "termo-agent": "Termo",
  "carteira-trabalho-agent": "Carteira de Trabalho",
  "comprovante-renda-agent": "Comprovante de Renda",
  "carta-fiador-agent": "Carta do Fiador",
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- promptKeys`
Expected: PASS.

- [ ] **Step 5: Create `src/ai/_base/prompt-defaults.ts`**

```ts
import { BASE_PROMPT } from "./basePrompt";
import { CNH_PROMPT } from "@/ai/agents/cnh-agent/prompt";
import { RGCPF_PROMPT } from "@/ai/agents/rgcpf-agent/prompt";
import { ATO_PROMPT } from "@/ai/agents/ato-agent/prompt";
import { QUADRO_RESUMO_PROMPT } from "@/ai/agents/quadro-resumo-agent/prompt";
import { FLUXO_PROMPT } from "@/ai/agents/fluxo-agent/prompt";
import { PLANTA_PROMPT } from "@/ai/agents/planta-agent/prompt";
import { COMPROVANTE_RESIDENCIA_PROMPT } from "@/ai/agents/comprovante-residencia-agent/prompt";
import { DECLARACAO_RESIDENCIA_PROMPT } from "@/ai/agents/declaracao-residencia-agent/prompt";
import { CERTIDAO_ESTADO_CIVIL_PROMPT } from "@/ai/agents/certidao-estado-civil-agent/prompt";
import { TERMO_PROMPT } from "@/ai/agents/termo-agent/prompt";
import { CARTEIRA_TRABALHO_PROMPT } from "@/ai/agents/carteira-trabalho-agent/prompt";
import { COMPROVANTE_RENDA_PROMPT } from "@/ai/agents/comprovante-renda-agent/prompt";
import { CARTA_FIADOR_PROMPT } from "@/ai/agents/carta-fiador-agent/prompt";
import type { PromptKey } from "@/lib/prompt-keys";

export const PROMPT_DEFAULTS: Record<PromptKey, string> = {
  "extraction-base": BASE_PROMPT,
  "cnh-agent": CNH_PROMPT,
  "rgcpf-agent": RGCPF_PROMPT,
  "ato-agent": ATO_PROMPT,
  "quadro-resumo-agent": QUADRO_RESUMO_PROMPT,
  "fluxo-agent": FLUXO_PROMPT,
  "planta-agent": PLANTA_PROMPT,
  "comprovante-residencia-agent": COMPROVANTE_RESIDENCIA_PROMPT,
  "declaracao-residencia-agent": DECLARACAO_RESIDENCIA_PROMPT,
  "certidao-estado-civil-agent": CERTIDAO_ESTADO_CIVIL_PROMPT,
  "termo-agent": TERMO_PROMPT,
  "carteira-trabalho-agent": CARTEIRA_TRABALHO_PROMPT,
  "comprovante-renda-agent": COMPROVANTE_RENDA_PROMPT,
  "carta-fiador-agent": CARTA_FIADOR_PROMPT,
};
```

> **Nota:** se algum agente não exporta o prompt como nome NOMEAGENT_PROMPT (ex: `COMPROVANTE_RESIDENCIA_PROMPT`), abra o arquivo em `src/ai/agents/<nome>/prompt.ts` e confirme o identificador exportado, ajustando o import.

- [ ] **Step 6: Commit**

```bash
git add src/lib/prompt-keys.ts src/ai/_base/prompt-defaults.ts src/__tests__/lib/promptKeys.test.ts
git commit -m "feat(ai): central prompt keys and defaults"
```

---

## Phase C — DB queries

### Task 4: Prompt-configs queries

**Files:**
- Create: `src/db/queries/prompt-configs.ts`
- Test: `src/__tests__/db/queries/promptConfigs.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/db/queries/promptConfigs.test.ts`:

```ts
import {
  listPromptConfigs,
  getPromptByKey,
  getActivePrompt,
  createDraft,
  activateVersion,
} from "@/db/queries/prompt-configs";
import { db } from "@/db";
import { promptConfigsTable, usersTable } from "@/db/schema";
import { eq } from "drizzle-orm";

describe("prompt-configs queries", () => {
  let adminId: number;

  beforeAll(async () => {
    // assumes test DB has a user seeded
    const [u] = await db.select({ id: usersTable.id }).from(usersTable).limit(1);
    adminId = u!.id;
  });

  beforeEach(async () => {
    await db.delete(promptConfigsTable);
  });

  it("getActivePrompt returns null when no row exists", async () => {
    expect(await getActivePrompt("cnh-agent")).toBeNull();
  });

  it("createDraft inserts a non-active row with incremented version", async () => {
    const v1 = await createDraft({ key: "cnh-agent", content: "A", createdBy: adminId });
    expect(v1.version).toBe(1);
    expect(v1.isActive).toBe(false);

    const v2 = await createDraft({ key: "cnh-agent", content: "B", createdBy: adminId });
    expect(v2.version).toBe(2);
  });

  it("activateVersion flips current active to the given version with audit trail", async () => {
    const v1 = await createDraft({ key: "cnh-agent", content: "A", createdBy: adminId });
    await db
      .update(promptConfigsTable)
      .set({ isActive: true, activatedBy: adminId, activatedAt: new Date() })
      .where(eq(promptConfigsTable.id, v1.id));

    const v2 = await createDraft({ key: "cnh-agent", content: "B", createdBy: adminId });
    await activateVersion({ key: "cnh-agent", version: v2.version, activatedBy: adminId });

    const active = await getActivePrompt("cnh-agent");
    expect(active?.version).toBe(2);
    expect(active?.content).toBe("B");
    expect(active?.activatedBy).toBe(adminId);

    const deactivated = await db
      .select()
      .from(promptConfigsTable)
      .where(eq(promptConfigsTable.id, v1.id));
    expect(deactivated[0]?.isActive).toBe(false);
    expect(deactivated[0]?.deactivatedAt).toBeInstanceOf(Date);
  });

  it("activateVersion throws when the version does not exist", async () => {
    await expect(
      activateVersion({ key: "cnh-agent", version: 99, activatedBy: adminId }),
    ).rejects.toThrow(/not found/i);
  });

  it("partial unique index prevents two active rows for the same key", async () => {
    const v1 = await createDraft({ key: "cnh-agent", content: "A", createdBy: adminId });
    await db
      .update(promptConfigsTable)
      .set({ isActive: true, activatedBy: adminId, activatedAt: new Date() })
      .where(eq(promptConfigsTable.id, v1.id));

    const v2 = await createDraft({ key: "cnh-agent", content: "B", createdBy: adminId });
    await expect(
      db
        .update(promptConfigsTable)
        .set({ isActive: true, activatedBy: adminId, activatedAt: new Date() })
        .where(eq(promptConfigsTable.id, v2.id)),
    ).rejects.toThrow();
  });

  it("listPromptConfigs returns all configured keys with their active version", async () => {
    const v1 = await createDraft({ key: "cnh-agent", content: "A", createdBy: adminId });
    await db
      .update(promptConfigsTable)
      .set({ isActive: true, activatedBy: adminId, activatedAt: new Date() })
      .where(eq(promptConfigsTable.id, v1.id));

    const list = await listPromptConfigs();
    const cnh = list.find((x) => x.key === "cnh-agent");
    expect(cnh?.activeVersion).toBe(1);
    expect(cnh?.totalVersions).toBe(1);
  });

  it("getPromptByKey returns full version history sorted desc", async () => {
    await createDraft({ key: "cnh-agent", content: "A", createdBy: adminId });
    await createDraft({ key: "cnh-agent", content: "B", createdBy: adminId });

    const history = await getPromptByKey("cnh-agent");
    expect(history.versions).toHaveLength(2);
    expect(history.versions[0]?.version).toBe(2);
    expect(history.versions[1]?.version).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- promptConfigs`
Expected: FAIL (module not found).

- [ ] **Step 3: Create `src/db/queries/prompt-configs.ts`**

```ts
import { db } from "@/db";
import { promptConfigsTable, type PromptConfig } from "@/db/schema";
import { and, desc, eq, max, sql } from "drizzle-orm";
import type { PromptKey } from "@/lib/prompt-keys";

export async function getActivePrompt(
  key: PromptKey,
): Promise<PromptConfig | null> {
  const [row] = await db
    .select()
    .from(promptConfigsTable)
    .where(
      and(
        eq(promptConfigsTable.agent, key),
        eq(promptConfigsTable.isActive, true),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getPromptByKey(key: PromptKey): Promise<{
  versions: PromptConfig[];
  active: PromptConfig | null;
}> {
  const versions = await db
    .select()
    .from(promptConfigsTable)
    .where(eq(promptConfigsTable.agent, key))
    .orderBy(desc(promptConfigsTable.version));

  const active = versions.find((v) => v.isActive) ?? null;
  return { versions, active };
}

export async function listPromptConfigs(): Promise<
  { key: string; activeVersion: number | null; totalVersions: number; lastEditedAt: Date | null; lastEditedBy: number | null }[]
> {
  const rows = await db
    .select({
      key: promptConfigsTable.agent,
      version: promptConfigsTable.version,
      isActive: promptConfigsTable.isActive,
      createdAt: promptConfigsTable.createdAt,
      createdBy: promptConfigsTable.createdBy,
    })
    .from(promptConfigsTable);

  const byKey = new Map<string, ReturnType<typeof aggregate>>();
  function aggregate() {
    return {
      activeVersion: null as number | null,
      totalVersions: 0,
      lastEditedAt: null as Date | null,
      lastEditedBy: null as number | null,
    };
  }

  for (const row of rows) {
    const acc = byKey.get(row.key) ?? aggregate();
    acc.totalVersions += 1;
    if (row.isActive) acc.activeVersion = row.version;
    if (!acc.lastEditedAt || row.createdAt > acc.lastEditedAt) {
      acc.lastEditedAt = row.createdAt;
      acc.lastEditedBy = row.createdBy;
    }
    byKey.set(row.key, acc);
  }

  return Array.from(byKey.entries()).map(([key, acc]) => ({ key, ...acc }));
}

export async function createDraft(input: {
  key: PromptKey;
  content: string;
  createdBy: number;
  notes?: string;
}): Promise<PromptConfig> {
  const [maxRow] = await db
    .select({ max: max(promptConfigsTable.version) })
    .from(promptConfigsTable)
    .where(eq(promptConfigsTable.agent, input.key));

  const nextVersion = (maxRow?.max ?? 0) + 1;

  const [row] = await db
    .insert(promptConfigsTable)
    .values({
      agent: input.key,
      version: nextVersion,
      content: input.content,
      notes: input.notes,
      createdBy: input.createdBy,
      isActive: false,
      isDefault: false,
    })
    .returning();

  return row!;
}

export async function activateVersion(input: {
  key: PromptKey;
  version: number;
  activatedBy: number;
}): Promise<PromptConfig> {
  return await db.transaction(async (tx) => {
    // verify the version exists
    const [target] = await tx
      .select()
      .from(promptConfigsTable)
      .where(
        and(
          eq(promptConfigsTable.agent, input.key),
          eq(promptConfigsTable.version, input.version),
        ),
      )
      .limit(1);

    if (!target) {
      throw new Error(`Version ${input.version} not found for key ${input.key}`);
    }

    // deactivate the currently active (if any)
    await tx
      .update(promptConfigsTable)
      .set({ isActive: false, deactivatedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(promptConfigsTable.agent, input.key),
          eq(promptConfigsTable.isActive, true),
        ),
      );

    // activate the target
    const [activated] = await tx
      .update(promptConfigsTable)
      .set({
        isActive: true,
        activatedBy: input.activatedBy,
        activatedAt: new Date(),
        deactivatedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(promptConfigsTable.id, target.id))
      .returning();

    return activated!;
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- promptConfigs`
Expected: all 7 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/db/queries/prompt-configs.ts src/__tests__/db/queries/promptConfigs.test.ts
git commit -m "feat(db): prompt_configs queries with versioning"
```

---

### Task 5: Seed prompt_configs with the 14 defaults

**Files:**
- Create: `scripts/seed-prompt-configs.ts`

- [ ] **Step 1: Create the seed script**

Create `scripts/seed-prompt-configs.ts`:

```ts
import { db } from "@/db";
import { promptConfigsTable, usersTable } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { PROMPT_DEFAULTS } from "@/ai/_base/prompt-defaults";
import { PROMPT_KEYS } from "@/lib/prompt-keys";

async function main() {
  const [admin] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.role, "admin"))
    .limit(1);

  if (!admin) {
    console.error("No admin user found — run scripts/seed-admin-role.ts first");
    process.exit(1);
  }

  const now = new Date();
  let inserted = 0;
  for (const key of PROMPT_KEYS) {
    const existing = await db
      .select()
      .from(promptConfigsTable)
      .where(and(eq(promptConfigsTable.agent, key), eq(promptConfigsTable.version, 1)))
      .limit(1);

    if (existing.length > 0) {
      console.log(`- ${key}: v1 already exists, skipping`);
      continue;
    }

    await db.insert(promptConfigsTable).values({
      agent: key,
      version: 1,
      content: PROMPT_DEFAULTS[key],
      isActive: true,
      isDefault: true,
      createdBy: admin.id,
      activatedBy: admin.id,
      activatedAt: now,
    });
    inserted += 1;
    console.log(`- ${key}: v1 inserted`);
  }
  console.log(`\nTotal: ${inserted} rows inserted`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Run the seed**

Run: `npx tsx scripts/seed-prompt-configs.ts`
Expected: 14 rows inserted.

Re-run it: expected all "already exists, skipping" (idempotent).

- [ ] **Step 3: Commit**

```bash
git add scripts/seed-prompt-configs.ts
git commit -m "feat(db): seed script for prompt_configs defaults"
```

---

## Phase D — Auth helper

### Task 6: `requireAdmin` helper

**Files:**
- Create: `src/lib/auth/requireAdmin.ts`
- Test: `src/__tests__/lib/auth/requireAdmin.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/lib/auth/requireAdmin.test.ts`:

```ts
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

jest.mock("@/lib/auth/session");
jest.mock("next/navigation", () => ({ redirect: jest.fn() }));

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockedRedirect = redirect as unknown as jest.Mock;

describe("requireAdmin", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns user when role is admin", async () => {
    mockedGetSession.mockResolvedValue({
      user: { id: 1, email: "a", role: "admin" } as never,
      sessionId: "s",
    });
    const user = await requireAdmin();
    expect(user.role).toBe("admin");
  });

  it("redirects to /login when no session", async () => {
    mockedGetSession.mockResolvedValue(null);
    await requireAdmin().catch(() => {});
    expect(mockedRedirect).toHaveBeenCalledWith("/login");
  });

  it("redirects to /dashboard when role is auditor", async () => {
    mockedGetSession.mockResolvedValue({
      user: { id: 2, email: "b", role: "auditor" } as never,
      sessionId: "s",
    });
    await requireAdmin().catch(() => {});
    expect(mockedRedirect).toHaveBeenCalledWith("/dashboard");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- requireAdmin`
Expected: FAIL (module not found).

- [ ] **Step 3: Create `src/lib/auth/requireAdmin.ts`**

```ts
import { redirect } from "next/navigation";
import { getSession } from "./session";
import type { User } from "@/db/schema";

export async function requireAdmin(): Promise<User> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }
  return session.user;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- requireAdmin`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/requireAdmin.ts src/__tests__/lib/auth/requireAdmin.test.ts
git commit -m "feat(auth): add requireAdmin helper"
```

---

## Phase E — Runtime prompt loading

### Task 7: `loadPrompt` + `snapshotPrompts`

**Files:**
- Create: `src/ai/_base/loadPrompt.ts`
- Test: `src/__tests__/ai/_base/loadPrompt.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/ai/_base/loadPrompt.test.ts`:

```ts
import { loadPrompt, snapshotPrompts } from "@/ai/_base/loadPrompt";
import { db } from "@/db";
import { promptConfigsTable, usersTable } from "@/db/schema";
import { PROMPT_DEFAULTS } from "@/ai/_base/prompt-defaults";
import { eq } from "drizzle-orm";

describe("loadPrompt / snapshotPrompts", () => {
  let adminId: number;

  beforeAll(async () => {
    const [u] = await db.select({ id: usersTable.id }).from(usersTable).limit(1);
    adminId = u!.id;
  });

  beforeEach(async () => {
    await db.delete(promptConfigsTable);
  });

  it("loadPrompt returns the active row when present", async () => {
    await db.insert(promptConfigsTable).values({
      agent: "cnh-agent",
      version: 5,
      content: "CUSTOM",
      isActive: true,
      isDefault: false,
      createdBy: adminId,
    });
    const r = await loadPrompt("cnh-agent");
    expect(r.content).toBe("CUSTOM");
    expect(r.version).toBe(5);
  });

  it("loadPrompt falls back to hardcoded default when no active row", async () => {
    const r = await loadPrompt("cnh-agent");
    expect(r.content).toBe(PROMPT_DEFAULTS["cnh-agent"]);
    expect(r.version).toBe(0);
  });

  it("snapshotPrompts returns all 14 keys", async () => {
    const snap = await snapshotPrompts();
    expect(Object.keys(snap).sort()).toHaveLength(14);
    expect(snap["extraction-base"]).toBeDefined();
    expect(snap["cnh-agent"]).toBeDefined();
  });

  it("snapshotPrompts returns a frozen object, content also frozen", async () => {
    const snap = await snapshotPrompts();
    expect(Object.isFrozen(snap)).toBe(true);
    expect(Object.isFrozen(snap["cnh-agent"])).toBe(true);
  });

  it("snapshotPrompts is stable — subsequent DB writes do not affect the returned snapshot", async () => {
    const snap = await snapshotPrompts();
    const before = snap["cnh-agent"].content;
    await db.insert(promptConfigsTable).values({
      agent: "cnh-agent",
      version: 99,
      content: "NEW",
      isActive: true,
      isDefault: false,
      createdBy: adminId,
    });
    expect(snap["cnh-agent"].content).toBe(before);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- loadPrompt`
Expected: FAIL.

- [ ] **Step 3: Create `src/ai/_base/loadPrompt.ts`**

```ts
import { db } from "@/db";
import { promptConfigsTable } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { PROMPT_DEFAULTS } from "./prompt-defaults";
import { PROMPT_KEYS, type PromptKey } from "@/lib/prompt-keys";

export type PromptSnapshotEntry = Readonly<{ content: string; version: number }>;
export type PromptSnapshot = Readonly<Record<PromptKey, PromptSnapshotEntry>>;

function fallback(key: PromptKey): PromptSnapshotEntry {
  return Object.freeze({ content: PROMPT_DEFAULTS[key], version: 0 });
}

export async function loadPrompt(key: PromptKey): Promise<PromptSnapshotEntry> {
  try {
    const [row] = await db
      .select({ content: promptConfigsTable.content, version: promptConfigsTable.version })
      .from(promptConfigsTable)
      .where(
        and(
          eq(promptConfigsTable.agent, key),
          eq(promptConfigsTable.isActive, true),
        ),
      )
      .limit(1);
    if (row) return Object.freeze({ content: row.content, version: row.version });
  } catch (err) {
    console.warn(`[loadPrompt] DB lookup failed for ${key}, using fallback:`, err);
  }
  return fallback(key);
}

export async function snapshotPrompts(): Promise<PromptSnapshot> {
  const entries: Partial<Record<PromptKey, PromptSnapshotEntry>> = {};
  try {
    const rows = await db
      .select({
        agent: promptConfigsTable.agent,
        content: promptConfigsTable.content,
        version: promptConfigsTable.version,
      })
      .from(promptConfigsTable)
      .where(
        and(
          eq(promptConfigsTable.isActive, true),
          inArray(promptConfigsTable.agent, PROMPT_KEYS as unknown as string[]),
        ),
      );

    for (const row of rows) {
      entries[row.agent as PromptKey] = Object.freeze({
        content: row.content,
        version: row.version,
      });
    }
  } catch (err) {
    console.warn("[snapshotPrompts] DB lookup failed, using fallbacks for all keys:", err);
  }

  for (const key of PROMPT_KEYS) {
    if (!entries[key]) entries[key] = fallback(key);
  }

  return Object.freeze(entries as Record<PromptKey, PromptSnapshotEntry>);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- loadPrompt`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/ai/_base/loadPrompt.ts src/__tests__/ai/_base/loadPrompt.test.ts
git commit -m "feat(ai): loadPrompt and immutable snapshotPrompts"
```

---

## Phase F — Runner & orchestrator refactor

### Task 8: Extend `AgentRunOptions` and `runAgent` with prompt versioning

**Files:**
- Modify: `src/ai/_base/types.ts`
- Modify: `src/ai/_base/runAgent.ts`
- Test: `src/__tests__/ai/_base/runAgent.promptVersion.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/ai/_base/runAgent.promptVersion.test.ts`:

```ts
import { runAgent } from "@/ai/_base/runAgent";
import { callLLM } from "@/ai/_base/llm";
import { z } from "zod";

jest.mock("@/ai/_base/llm");
const mockedCallLLM = callLLM as jest.MockedFunction<typeof callLLM>;

describe("runAgent — promptVersion propagation", () => {
  beforeEach(() => {
    mockedCallLLM.mockResolvedValue({
      text: '{"ok":true}',
      provider: "google",
      model: "gemini-2.5-pro",
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
    });
  });

  it("records promptVersion in the result when provided", async () => {
    const schema = z.object({ ok: z.boolean() });
    const result = await runAgent({
      agent: "cnh-agent",
      systemPrompt: "P",
      promptVersion: "base:v2|cnh-agent:v7",
      userInput: { text: "go" },
      schema,
    });
    expect(result.ok).toBe(true);
    expect(result.promptVersion).toBe("base:v2|cnh-agent:v7");
  });

  it("records promptVersion = null when not provided", async () => {
    const schema = z.object({ ok: z.boolean() });
    const result = await runAgent({
      agent: "cnh-agent",
      systemPrompt: "P",
      userInput: { text: "go" },
      schema,
    });
    expect(result.promptVersion).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- runAgent.promptVersion`
Expected: FAIL.

- [ ] **Step 3: Update `src/ai/_base/types.ts`**

Adicione `promptOverride` e `promptVersion`:

```ts
export type AgentRunOptions = {
  provider?: Provider;
  modelKey?: ModelKey;
  temperature?: number;
  maxTokens?: number;
  promptOverride?: { content: string; version: string };
};

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
  usage?: TokenUsage;
  promptVersion?: string;
};
```

- [ ] **Step 4: Update `src/ai/_base/runAgent.ts`**

Adicione o campo no `RunAgentArgs` e inclua no resultado:

```ts
type RunAgentArgs<T> = {
  agent: AgentName;
  systemPrompt: string;
  promptVersion?: string;
  userInput: AgentInput;
  schema: ZodSchema<T>;
  options?: AgentRunOptions;
};
```

Nos dois pontos de `return { agent, ok: true, ... }` e `return { agent, ok: false, ... }`, adicione `promptVersion: args.promptVersion`:

```ts
return {
  agent,
  ok: true,
  data: validated.data,
  raw: lastRaw,
  provider: llmResult.provider,
  model: llmResult.model,
  attempts,
  usage: totalUsage,
  promptVersion: args.promptVersion,
};
```

(Aplique a mesma adição nos 3 `return` statements.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- runAgent.promptVersion`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/ai/_base/types.ts src/ai/_base/runAgent.ts src/__tests__/ai/_base/runAgent.promptVersion.test.ts
git commit -m "feat(ai): runAgent propagates promptVersion to result"
```

---

### Task 9: Refactor the 13 extraction agents to accept prompt overrides

**Files:**
- Modify: `src/ai/agents/cnh-agent/agent.ts`, `rgcpf-agent/agent.ts`, `ato-agent/agent.ts`, `quadro-resumo-agent/agent.ts`, `fluxo-agent/agent.ts`, `planta-agent/agent.ts`, `comprovante-residencia-agent/agent.ts`, `declaracao-residencia-agent/agent.ts`, `certidao-estado-civil-agent/agent.ts`, `termo-agent/agent.ts`, `carteira-trabalho-agent/agent.ts`, `comprovante-renda-agent/agent.ts`, `carta-fiador-agent/agent.ts`

**Mechanical pattern:** aplica identicamente nos 13 arquivos. Exemplo com `cnh-agent`:

- [ ] **Step 1: Update each `agent.ts`**

Transforme (exemplo CNH — `src/ai/agents/cnh-agent/agent.ts`):

```ts
import type { AgentInput, AgentRunOptions, AgentResult } from "@/ai/_base/types";
import { runAgent } from "@/ai/_base/runAgent";
import { cnhSchema, type CnhOutput } from "./schema";
import { CNH_PROMPT } from "./prompt";

export async function runCnhAgent(
  input: AgentInput,
  options?: AgentRunOptions,
): Promise<AgentResult<CnhOutput>> {
  const override = options?.promptOverride;
  return runAgent({
    agent: "cnh-agent",
    systemPrompt: override?.content ?? CNH_PROMPT,
    promptVersion: override?.version,
    userInput: input,
    schema: cnhSchema,
    options,
  });
}
```

Aplique a mesma transformação nos outros 12 arquivos. **Padrão:**
1. Leia `const override = options?.promptOverride;`
2. `systemPrompt: override?.content ?? <AGENTE>_PROMPT`
3. `promptVersion: override?.version`

Lista dos arquivos (ajuste o nome da constante conforme exportada):
- `rgcpf-agent/agent.ts` → `RGCPF_PROMPT`
- `ato-agent/agent.ts` → `ATO_PROMPT`
- `quadro-resumo-agent/agent.ts` → `QUADRO_RESUMO_PROMPT`
- `fluxo-agent/agent.ts` → `FLUXO_PROMPT`
- `planta-agent/agent.ts` → `PLANTA_PROMPT`
- `comprovante-residencia-agent/agent.ts` → `COMPROVANTE_RESIDENCIA_PROMPT`
- `declaracao-residencia-agent/agent.ts` → `DECLARACAO_RESIDENCIA_PROMPT`
- `certidao-estado-civil-agent/agent.ts` → `CERTIDAO_ESTADO_CIVIL_PROMPT`
- `termo-agent/agent.ts` → `TERMO_PROMPT`
- `carteira-trabalho-agent/agent.ts` → `CARTEIRA_TRABALHO_PROMPT`
- `comprovante-renda-agent/agent.ts` → `COMPROVANTE_RENDA_PROMPT`
- `carta-fiador-agent/agent.ts` → `CARTA_FIADOR_PROMPT`

- [ ] **Step 2: Run the existing agent tests to confirm no regression**

Run: `npm test -- ai/agents`
Expected: PASS (testes existentes validam o output estruturado, não mudou).

- [ ] **Step 3: Commit**

```bash
git add src/ai/agents
git commit -m "refactor(ai): agents accept promptOverride from options"
```

---

### Task 10: Orchestrator snapshots prompts and injects overrides

**Files:**
- Modify: `src/ai/orchestrator/contractOrchestrator.ts`
- Test: `src/__tests__/ai/orchestrator/snapshot.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/ai/orchestrator/snapshot.test.ts`:

```ts
import { analyzeContract } from "@/ai/orchestrator/contractOrchestrator";
import * as loadPromptModule from "@/ai/_base/loadPrompt";

jest.mock("@/ai/_base/loadPrompt");

const mockedSnapshot = loadPromptModule.snapshotPrompts as jest.MockedFunction<
  typeof loadPromptModule.snapshotPrompts
>;

// mock the agent runners to assert what overrides they received
jest.mock("@/ai/agents/cnh-agent/agent", () => ({
  runCnhAgent: jest.fn().mockResolvedValue({
    agent: "cnh-agent",
    ok: true,
    data: { output: {} },
    attempts: 1,
    promptVersion: "base:v3|cnh-agent:v5",
  }),
}));

describe("analyzeContract — snapshot", () => {
  beforeEach(() => {
    mockedSnapshot.mockResolvedValue(
      Object.freeze({
        "extraction-base": Object.freeze({ content: "BASE-V3", version: 3 }),
        "cnh-agent": Object.freeze({ content: "CNH-V5", version: 5 }),
      }) as never,
    );
  });

  it("calls snapshotPrompts exactly once per analyzeContract run", async () => {
    const docMap = new Map();
    docMap.set("cnh-agent", [{ data: Buffer.from(""), mimeType: "application/pdf" }]);
    await analyzeContract(docMap, "{}");
    expect(mockedSnapshot).toHaveBeenCalledTimes(1);
  });

  it("passes the composite promptOverride to the agent runner", async () => {
    const { runCnhAgent } = jest.requireMock("@/ai/agents/cnh-agent/agent");
    const docMap = new Map();
    docMap.set("cnh-agent", [{ data: Buffer.from(""), mimeType: "application/pdf" }]);
    await analyzeContract(docMap, "{}");
    const callArgs = (runCnhAgent as jest.Mock).mock.calls[0];
    const options = callArgs[1];
    expect(options.promptOverride).toEqual({
      content: "BASE-V3\n\nCNH-V5",
      version: "base:v3|cnh-agent:v5",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- orchestrator/snapshot`
Expected: FAIL.

- [ ] **Step 3: Modify `src/ai/orchestrator/contractOrchestrator.ts`**

No topo do arquivo, adicione o import:

```ts
import { snapshotPrompts, type PromptSnapshot } from "@/ai/_base/loadPrompt";
import type { PromptKey } from "@/lib/prompt-keys";
import { isPromptKey } from "@/lib/prompt-keys";
```

Modifique `analyzeContract` para tirar o snapshot no início:

```ts
export async function analyzeContract(
  documentMap: Map<string, DocumentContent[]>,
  contextJson: string,
  options?: AgentRunOptions,
  reservaPlanta?: { bloco: string; numero: string },
): Promise<ContractAnalysis> {
  const prompts = await snapshotPrompts();
  const extractionResults = await runExtraction(documentMap, contextJson, options, prompts);
  // ... resto do fluxo igual
```

Modifique `runExtraction` para aceitar `prompts` e montar o override por agente:

```ts
export async function runExtraction(
  documentMap: Map<string, DocumentContent[]>,
  contextJson: string,
  options?: AgentRunOptions,
  prompts?: PromptSnapshot,
): Promise<AgentResult<unknown>[]> {
  const keys = Array.from(documentMap.keys());

  return Promise.all(
    keys.map((key) => {
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
        return Promise.resolve({
          agent: agentName,
          ok: false,
          error: "No documents found for this agent",
          attempts: 0,
          pessoa,
        } as AgentResult<unknown>);
      }

      const input = buildAgentInput(docs, contextJson);
      const agentOptions = resolveAgentOptions(agentName, input, options);

      // Inject composite prompt override if we have a snapshot and the agent is a known key
      if (prompts && isPromptKey(agentName)) {
        const base = prompts["extraction-base"];
        const agent = prompts[agentName];
        agentOptions.promptOverride = {
          content: `${base.content}\n\n${agent.content}`,
          version: `base:v${base.version}|${agentName}:v${agent.version}`,
        };
      }

      const label = pessoa ? `${agentName} [${pessoa}]` : agentName;
      console.log(
        `[orchestrator] Running ${label} with ${docs.length} document(s), text: ${input.text.length} chars, images: ${input.images?.length ?? 0}, model: ${agentOptions.modelKey ?? "default"}`,
      );

      return runner(input, agentOptions).then((result) => ({ ...result, pessoa }));
    }),
  );
}
```

> Nota: `validation-agent` segue rodando com seu prompt hardcoded por ora — não está na lista `PROMPT_KEYS`, logo `isPromptKey(agentName)` retorna false e ele usa o prompt original.

- [ ] **Step 4: Run tests**

Run: `npm test -- orchestrator/snapshot`
Expected: PASS.

Run: `npm test -- ai/orchestrator` (suite completa)
Expected: PASS (sem regressão).

- [ ] **Step 5: Commit**

```bash
git add src/ai/orchestrator/contractOrchestrator.ts src/__tests__/ai/orchestrator/snapshot.test.ts
git commit -m "feat(ai): orchestrator snapshots prompts once, injects overrides"
```

---

## Phase G — API routes

### Task 11: GET `/api/admin/prompts`

**Files:**
- Create: `src/app/api/admin/prompts/route.ts`
- Test: `src/__tests__/api/admin/prompts/list.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/api/admin/prompts/list.test.ts`:

```ts
import { GET } from "@/app/api/admin/prompts/route";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { listPromptConfigs } from "@/db/queries/prompt-configs";

jest.mock("@/lib/auth/requireAdmin");
jest.mock("@/db/queries/prompt-configs");

const mockedRequireAdmin = requireAdmin as jest.MockedFunction<typeof requireAdmin>;
const mockedList = listPromptConfigs as jest.MockedFunction<typeof listPromptConfigs>;

describe("GET /api/admin/prompts", () => {
  beforeEach(() => {
    mockedRequireAdmin.mockResolvedValue({ id: 1, role: "admin" } as never);
    mockedList.mockResolvedValue([
      { key: "cnh-agent", activeVersion: 1, totalVersions: 1, lastEditedAt: new Date(), lastEditedBy: 1 },
    ]);
  });

  it("returns 200 with the list merged with PROMPT_KEYS (14 entries)", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.prompts).toHaveLength(14);
    const cnh = body.prompts.find((p: { key: string }) => p.key === "cnh-agent");
    expect(cnh.activeVersion).toBe(1);
    const extractionBase = body.prompts.find((p: { key: string }) => p.key === "extraction-base");
    expect(extractionBase.activeVersion).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- api/admin/prompts/list`
Expected: FAIL.

- [ ] **Step 3: Create `src/app/api/admin/prompts/route.ts`**

```ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { listPromptConfigs } from "@/db/queries/prompt-configs";
import { PROMPT_KEYS, PROMPT_KEY_LABELS, CRITICAL_PROMPT_KEYS } from "@/lib/prompt-keys";

export async function GET() {
  await requireAdmin();
  const rows = await listPromptConfigs();
  const byKey = new Map(rows.map((r) => [r.key, r]));

  const prompts = PROMPT_KEYS.map((key) => {
    const existing = byKey.get(key);
    return {
      key,
      label: PROMPT_KEY_LABELS[key],
      critical: CRITICAL_PROMPT_KEYS.has(key),
      activeVersion: existing?.activeVersion ?? null,
      totalVersions: existing?.totalVersions ?? 0,
      lastEditedAt: existing?.lastEditedAt ?? null,
      lastEditedBy: existing?.lastEditedBy ?? null,
    };
  });

  return NextResponse.json({ prompts });
}
```

- [ ] **Step 4: Run test**

Run: `npm test -- api/admin/prompts/list`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/prompts/route.ts src/__tests__/api/admin/prompts/list.test.ts
git commit -m "feat(api): GET /api/admin/prompts lists 14 keys with activity"
```

---

### Task 12: GET + POST `/api/admin/prompts/[key]`

**Files:**
- Create: `src/app/api/admin/prompts/[key]/route.ts`
- Test: `src/__tests__/api/admin/prompts/key.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/api/admin/prompts/key.test.ts`:

```ts
import { GET, POST } from "@/app/api/admin/prompts/[key]/route";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getPromptByKey, createDraft } from "@/db/queries/prompt-configs";

jest.mock("@/lib/auth/requireAdmin");
jest.mock("@/db/queries/prompt-configs");

const mockedAdmin = requireAdmin as jest.MockedFunction<typeof requireAdmin>;
const mockedGet = getPromptByKey as jest.MockedFunction<typeof getPromptByKey>;
const mockedCreate = createDraft as jest.MockedFunction<typeof createDraft>;

describe("GET/POST /api/admin/prompts/[key]", () => {
  beforeEach(() => {
    mockedAdmin.mockResolvedValue({ id: 1, role: "admin" } as never);
  });

  it("GET returns 404 for unknown key", async () => {
    const req = new Request("http://t/api/admin/prompts/foo");
    const res = await GET(req, { params: Promise.resolve({ key: "foo" }) });
    expect(res.status).toBe(404);
  });

  it("GET returns 200 with versions", async () => {
    mockedGet.mockResolvedValue({
      versions: [{ id: "a", agent: "cnh-agent", version: 1 } as never],
      active: { id: "a", agent: "cnh-agent", version: 1 } as never,
    });
    const req = new Request("http://t/api/admin/prompts/cnh-agent");
    const res = await GET(req, { params: Promise.resolve({ key: "cnh-agent" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.versions).toHaveLength(1);
  });

  it("POST creates a draft when body is valid", async () => {
    mockedCreate.mockResolvedValue({ id: "x", version: 2, isActive: false } as never);
    const req = new Request("http://t/api/admin/prompts/cnh-agent", {
      method: "POST",
      body: JSON.stringify({ content: "NEW PROMPT", notes: "test" }),
    });
    const res = await POST(req, { params: Promise.resolve({ key: "cnh-agent" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.version).toBe(2);
    expect(mockedCreate).toHaveBeenCalledWith({
      key: "cnh-agent",
      content: "NEW PROMPT",
      notes: "test",
      createdBy: 1,
    });
  });

  it("POST returns 400 for empty content", async () => {
    const req = new Request("http://t/api/admin/prompts/cnh-agent", {
      method: "POST",
      body: JSON.stringify({ content: "" }),
    });
    const res = await POST(req, { params: Promise.resolve({ key: "cnh-agent" }) });
    expect(res.status).toBe(400);
  });

  it("POST returns 400 when content exceeds 50000 chars", async () => {
    const req = new Request("http://t/api/admin/prompts/cnh-agent", {
      method: "POST",
      body: JSON.stringify({ content: "a".repeat(50001) }),
    });
    const res = await POST(req, { params: Promise.resolve({ key: "cnh-agent" }) });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- api/admin/prompts/key`
Expected: FAIL.

- [ ] **Step 3: Create `src/app/api/admin/prompts/[key]/route.ts`**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getPromptByKey, createDraft } from "@/db/queries/prompt-configs";
import { isPromptKey } from "@/lib/prompt-keys";

const postSchema = z.object({
  content: z.string().min(1).max(50000),
  notes: z.string().max(500).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  await requireAdmin();
  const { key } = await params;
  if (!isPromptKey(key)) {
    return NextResponse.json({ error: "Unknown prompt key" }, { status: 404 });
  }
  const data = await getPromptByKey(key);
  return NextResponse.json(data);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const admin = await requireAdmin();
  const { key } = await params;
  if (!isPromptKey(key)) {
    return NextResponse.json({ error: "Unknown prompt key" }, { status: 404 });
  }
  const body = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const row = await createDraft({
    key,
    content: parsed.data.content,
    notes: parsed.data.notes,
    createdBy: admin.id,
  });
  return NextResponse.json({ id: row.id, version: row.version });
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- api/admin/prompts/key`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/prompts/[key]/route.ts src/__tests__/api/admin/prompts/key.test.ts
git commit -m "feat(api): GET/POST /api/admin/prompts/[key]"
```

---

### Task 13: POST `/api/admin/prompts/[key]/activate`

**Files:**
- Create: `src/app/api/admin/prompts/[key]/activate/route.ts`
- Test: `src/__tests__/api/admin/prompts/activate.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/api/admin/prompts/activate.test.ts`:

```ts
import { POST } from "@/app/api/admin/prompts/[key]/activate/route";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { activateVersion } from "@/db/queries/prompt-configs";

jest.mock("@/lib/auth/requireAdmin");
jest.mock("@/db/queries/prompt-configs");

const mockedAdmin = requireAdmin as jest.MockedFunction<typeof requireAdmin>;
const mockedActivate = activateVersion as jest.MockedFunction<typeof activateVersion>;

describe("POST /api/admin/prompts/[key]/activate", () => {
  beforeEach(() => {
    mockedAdmin.mockResolvedValue({ id: 1, role: "admin" } as never);
  });

  it("activates the version and returns 200", async () => {
    mockedActivate.mockResolvedValue({ id: "x", version: 3, isActive: true } as never);
    const req = new Request("http://t", {
      method: "POST",
      body: JSON.stringify({ version: 3 }),
    });
    const res = await POST(req, { params: Promise.resolve({ key: "cnh-agent" }) });
    expect(res.status).toBe(200);
    expect(mockedActivate).toHaveBeenCalledWith({
      key: "cnh-agent",
      version: 3,
      activatedBy: 1,
    });
  });

  it("returns 409 when the version does not exist", async () => {
    mockedActivate.mockRejectedValue(new Error("Version 99 not found for key cnh-agent"));
    const req = new Request("http://t", {
      method: "POST",
      body: JSON.stringify({ version: 99 }),
    });
    const res = await POST(req, { params: Promise.resolve({ key: "cnh-agent" }) });
    expect(res.status).toBe(409);
  });

  it("returns 400 for invalid body", async () => {
    const req = new Request("http://t", {
      method: "POST",
      body: JSON.stringify({ version: "not-a-number" }),
    });
    const res = await POST(req, { params: Promise.resolve({ key: "cnh-agent" }) });
    expect(res.status).toBe(400);
  });

  it("returns 404 for unknown key", async () => {
    const req = new Request("http://t", {
      method: "POST",
      body: JSON.stringify({ version: 1 }),
    });
    const res = await POST(req, { params: Promise.resolve({ key: "foo" }) });
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- api/admin/prompts/activate`
Expected: FAIL.

- [ ] **Step 3: Create `src/app/api/admin/prompts/[key]/activate/route.ts`**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { activateVersion } from "@/db/queries/prompt-configs";
import { isPromptKey } from "@/lib/prompt-keys";

const bodySchema = z.object({ version: z.number().int().positive() });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const admin = await requireAdmin();
  const { key } = await params;
  if (!isPromptKey(key)) {
    return NextResponse.json({ error: "Unknown prompt key" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const row = await activateVersion({
      key,
      version: parsed.data.version,
      activatedBy: admin.id,
    });
    return NextResponse.json({ id: row.id, version: row.version });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    if (msg.toLowerCase().includes("not found")) {
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- api/admin/prompts/activate`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/prompts/[key]/activate/route.ts src/__tests__/api/admin/prompts/activate.test.ts
git commit -m "feat(api): POST /api/admin/prompts/[key]/activate"
```

---

### Task 14: POST `/api/admin/prompts/[key]/test`

**Files:**
- Create: `src/app/api/admin/prompts/[key]/test/route.ts`
- Test: `src/__tests__/api/admin/prompts/test.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/api/admin/prompts/test.test.ts`:

```ts
import { POST } from "@/app/api/admin/prompts/[key]/test/route";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { cvcrmClient } from "@/lib/cvcrm/client";
import { downloadDocuments } from "@/lib/cvcrm/documentDownloader";
import * as loadPromptModule from "@/ai/_base/loadPrompt";
import { runCnhAgent } from "@/ai/agents/cnh-agent/agent";

jest.mock("@/lib/auth/requireAdmin");
jest.mock("@/lib/cvcrm/client");
jest.mock("@/lib/cvcrm/documentDownloader");
jest.mock("@/ai/_base/loadPrompt");
jest.mock("@/ai/agents/cnh-agent/agent");

const mockedAdmin = requireAdmin as jest.MockedFunction<typeof requireAdmin>;
const mockedRunCnh = runCnhAgent as jest.MockedFunction<typeof runCnhAgent>;
const mockedSnapshot = loadPromptModule.snapshotPrompts as jest.MockedFunction<
  typeof loadPromptModule.snapshotPrompts
>;

describe("POST /api/admin/prompts/[key]/test", () => {
  beforeEach(() => {
    mockedAdmin.mockResolvedValue({ id: 1, role: "admin" } as never);
    mockedSnapshot.mockResolvedValue(
      Object.freeze({
        "extraction-base": Object.freeze({ content: "BASE", version: 1 }),
        "cnh-agent": Object.freeze({ content: "CNH", version: 1 }),
      }) as never,
    );
    (cvcrmClient.getReserva as jest.Mock) = jest.fn().mockResolvedValue({
      idReserva: 123,
      documentos: [{ tipo_documento: "CNH", url: "http://x", pessoa: "titular" }],
    });
    (downloadDocuments as jest.Mock) = jest.fn().mockResolvedValue([
      { data: Buffer.from(""), mimeType: "application/pdf", nome: "cnh.pdf" },
    ]);
    mockedRunCnh.mockResolvedValue({
      agent: "cnh-agent",
      ok: true,
      data: { output: { nome: "X" } } as never,
      raw: "{...}",
      attempts: 1,
      provider: "google",
      model: "gemini",
      promptVersion: "base:v1|cnh-agent:v1",
    } as never);
  });

  it("runs the draft prompt against a real reservation and returns output", async () => {
    const req = new Request("http://t", {
      method: "POST",
      body: JSON.stringify({ content: "DRAFT CNH", idReserva: 123 }),
    });
    const res = await POST(req, { params: Promise.resolve({ key: "cnh-agent" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.output).toBeDefined();
    const callOptions = mockedRunCnh.mock.calls[0]![1];
    expect(callOptions.promptOverride.content).toBe("BASE\n\nDRAFT CNH");
  });

  it("returns 400 when body is invalid", async () => {
    const req = new Request("http://t", {
      method: "POST",
      body: JSON.stringify({ content: "DRAFT", idReserva: "nope" }),
    });
    const res = await POST(req, { params: Promise.resolve({ key: "cnh-agent" }) });
    expect(res.status).toBe(400);
  });

  it("requires targetAgent when key is extraction-base", async () => {
    const req = new Request("http://t", {
      method: "POST",
      body: JSON.stringify({ content: "NEW BASE", idReserva: 123 }),
    });
    const res = await POST(req, { params: Promise.resolve({ key: "extraction-base" }) });
    expect(res.status).toBe(400);
  });

  it("returns 422 when the reservation has no document of the expected type", async () => {
    (cvcrmClient.getReserva as jest.Mock).mockResolvedValueOnce({
      idReserva: 123,
      documentos: [{ tipo_documento: "RG", url: "http://x", pessoa: "titular" }],
    });
    const req = new Request("http://t", {
      method: "POST",
      body: JSON.stringify({ content: "DRAFT", idReserva: 123 }),
    });
    const res = await POST(req, { params: Promise.resolve({ key: "cnh-agent" }) });
    expect(res.status).toBe(422);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- api/admin/prompts/test`
Expected: FAIL.

- [ ] **Step 3: Create `src/app/api/admin/prompts/[key]/test/route.ts`**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { snapshotPrompts } from "@/ai/_base/loadPrompt";
import { isPromptKey, PROMPT_KEYS, type PromptKey } from "@/lib/prompt-keys";
import { cvcrmClient } from "@/lib/cvcrm/client";
import { downloadDocuments } from "@/lib/cvcrm/documentDownloader";
import { AGENT_DOCUMENT_TYPES } from "@/lib/cvcrm/constants";
import type { AgentRunOptions } from "@/ai/_base/types";

import { runCnhAgent } from "@/ai/agents/cnh-agent/agent";
import { runRgcpfAgent } from "@/ai/agents/rgcpf-agent/agent";
import { runAtoAgent } from "@/ai/agents/ato-agent/agent";
import { runQuadroResumoAgent } from "@/ai/agents/quadro-resumo-agent/agent";
import { runFluxoAgent } from "@/ai/agents/fluxo-agent/agent";
import { runPlantaAgent } from "@/ai/agents/planta-agent/agent";
import { runComprovanteResidenciaAgent } from "@/ai/agents/comprovante-residencia-agent/agent";
import { runDeclaracaoResidenciaAgent } from "@/ai/agents/declaracao-residencia-agent/agent";
import { runCertidaoEstadoCivilAgent } from "@/ai/agents/certidao-estado-civil-agent/agent";
import { runTermoAgent } from "@/ai/agents/termo-agent/agent";
import { runCarteiraTrabalhoAgent } from "@/ai/agents/carteira-trabalho-agent/agent";
import { runComprovanteRendaAgent } from "@/ai/agents/comprovante-renda-agent/agent";
import { runCartaFiadorAgent } from "@/ai/agents/carta-fiador-agent/agent";

const RUNNERS = {
  "cnh-agent": runCnhAgent,
  "rgcpf-agent": runRgcpfAgent,
  "ato-agent": runAtoAgent,
  "quadro-resumo-agent": runQuadroResumoAgent,
  "fluxo-agent": runFluxoAgent,
  "planta-agent": runPlantaAgent,
  "comprovante-residencia-agent": runComprovanteResidenciaAgent,
  "declaracao-residencia-agent": runDeclaracaoResidenciaAgent,
  "certidao-estado-civil-agent": runCertidaoEstadoCivilAgent,
  "termo-agent": runTermoAgent,
  "carteira-trabalho-agent": runCarteiraTrabalhoAgent,
  "comprovante-renda-agent": runComprovanteRendaAgent,
  "carta-fiador-agent": runCartaFiadorAgent,
} as const;

const bodySchema = z.object({
  content: z.string().min(1).max(50000),
  idReserva: z.number().int().positive(),
  targetAgent: z.enum(PROMPT_KEYS as unknown as [string, ...string[]]).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  await requireAdmin();
  const { key } = await params;
  if (!isPromptKey(key)) {
    return NextResponse.json({ error: "Unknown prompt key" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Resolve which agent will run
  let runnerKey: keyof typeof RUNNERS;
  if (key === "extraction-base") {
    if (!parsed.data.targetAgent || parsed.data.targetAgent === "extraction-base") {
      return NextResponse.json(
        { error: "targetAgent is required when testing extraction-base" },
        { status: 400 },
      );
    }
    runnerKey = parsed.data.targetAgent as keyof typeof RUNNERS;
  } else {
    runnerKey = key as keyof typeof RUNNERS;
  }

  // Fetch reservation + filter documents for the target agent
  const reserva = await cvcrmClient.getReserva(parsed.data.idReserva);
  const expectedTypes = AGENT_DOCUMENT_TYPES[runnerKey] ?? [];
  const matchingDocs = (reserva.documentos ?? []).filter((d: { tipo_documento: string }) =>
    expectedTypes.some((t) => d.tipo_documento?.toLowerCase().includes(t.toLowerCase())),
  );
  if (matchingDocs.length === 0) {
    return NextResponse.json(
      { error: `No documents of type ${expectedTypes.join("/")} found in reservation ${parsed.data.idReserva}` },
      { status: 422 },
    );
  }

  const docs = await downloadDocuments(matchingDocs);

  // Compose prompt: base (from snapshot) + draft content
  const snap = await snapshotPrompts();
  const base = snap["extraction-base"];
  const agentContent = key === "extraction-base" ? snap[runnerKey].content : parsed.data.content;
  const baseContent = key === "extraction-base" ? parsed.data.content : base.content;

  const options: AgentRunOptions = {
    promptOverride: {
      content: `${baseContent}\n\n${agentContent}`,
      version: `test-draft`,
    },
  };

  const runner = RUNNERS[runnerKey];
  const start = Date.now();
  const result = await runner(
    {
      text: JSON.stringify({ reserva, docs: matchingDocs }, null, 2),
      files: docs.map((d) => ({ data: d.data, mimeType: d.mimeType })),
    },
    options,
  );
  const latencyMs = Date.now() - start;

  return NextResponse.json({
    ok: result.ok,
    output: result.data,
    rawOutput: result.raw,
    error: result.error,
    provider: result.provider,
    model: result.model,
    latencyMs,
  });
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- api/admin/prompts/test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/prompts/[key]/test/route.ts src/__tests__/api/admin/prompts/test.test.ts
git commit -m "feat(api): POST /api/admin/prompts/[key]/test runs draft against real reservation"
```

---

## Phase H — UI

### Task 15: Admin layout + sidebar nav

**Files:**
- Create: `src/app/(private)/admin/layout.tsx`
- Modify: `src/components/layout/app-sidebar.tsx`
- Modify: `src/app/(private)/layout.tsx`

- [ ] **Step 1: Create the admin layout**

Create `src/app/(private)/admin/layout.tsx`:

```tsx
import { requireAdmin } from "@/lib/auth/requireAdmin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return <>{children}</>;
}
```

- [ ] **Step 2: Update sidebar to accept role and conditionally show Prompts link**

Modify `src/components/layout/app-sidebar.tsx` — update the `navMain` definition to be computed from props:

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, Settings, ScrollText, Pencil } from 'lucide-react';
// ... existing imports unchanged

type NavItem = { label: string; href: string; icon: typeof LayoutDashboard };

const BASE_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Reservas', href: '/reservas', icon: FileText },
  { label: 'Regras', href: '/regras', icon: Settings },
  { label: 'Logs', href: '/logs', icon: ScrollText },
];

const ADMIN_NAV: NavItem[] = [
  { label: 'Prompts', href: '/admin/prompts', icon: Pencil },
];

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: { name: string; email: string; role: 'admin' | 'auditor' };
}) {
  const pathname = usePathname();
  const navMain = user.role === 'admin' ? [...BASE_NAV, ...ADMIN_NAV] : BASE_NAV;
  // ... rest of the component continues unchanged, iterating navMain
  // (no other structural changes)
}
```

- [ ] **Step 3: Pass `role` from private layout**

Modify `src/app/(private)/layout.tsx` — onde o `user` é passado pro `AppSidebar`, inclua `role`:

```tsx
<AppSidebar user={{ name: user.name ?? user.email, email: user.email, role: user.role }} />
```

- [ ] **Step 4: Manual smoke test**

Run: `npm run dev`
Login como admin → sidebar deve mostrar item "Prompts".
Login como auditor → sidebar NÃO deve mostrar "Prompts". Se navegar manualmente pra `/admin/prompts`, redireciona pra `/dashboard`.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(private\)/admin/layout.tsx src/components/layout/app-sidebar.tsx src/app/\(private\)/layout.tsx
git commit -m "feat(ui): admin layout + conditional Prompts nav"
```

---

### Task 16: Install `diff` dependency + utility

**Files:**
- Modify: `package.json`
- Create: `src/lib/prompt-diff.ts`
- Test: `src/__tests__/lib/promptDiff.test.ts`

- [ ] **Step 1: Install `diff`**

Run: `npm install diff && npm install --save-dev @types/diff`

- [ ] **Step 2: Write the failing test**

Create `src/__tests__/lib/promptDiff.test.ts`:

```ts
import { computePromptDiff } from "@/lib/prompt-diff";

describe("computePromptDiff", () => {
  it("returns added/removed counts and parts", () => {
    const d = computePromptDiff("line one\nline two", "line one\nline three");
    expect(d.added).toBeGreaterThanOrEqual(1);
    expect(d.removed).toBeGreaterThanOrEqual(1);
    expect(d.parts.some((p) => p.added)).toBe(true);
    expect(d.parts.some((p) => p.removed)).toBe(true);
  });

  it("flags large reduction (>20%)", () => {
    const oldText = "x".repeat(1000);
    const newText = "x".repeat(500);
    const d = computePromptDiff(oldText, newText);
    expect(d.largeReduction).toBe(true);
  });

  it("does not flag small changes", () => {
    const d = computePromptDiff("abcdefgh", "abcxefgh");
    expect(d.largeReduction).toBe(false);
  });
});
```

- [ ] **Step 3: Create `src/lib/prompt-diff.ts`**

```ts
import { diffLines } from "diff";

export type DiffPart = { value: string; added?: boolean; removed?: boolean };

export type PromptDiff = {
  parts: DiffPart[];
  added: number;
  removed: number;
  sizeDeltaPct: number;
  largeReduction: boolean;
};

export function computePromptDiff(oldText: string, newText: string): PromptDiff {
  const parts = diffLines(oldText, newText);
  let added = 0;
  let removed = 0;
  for (const p of parts) {
    const lines = p.value.split("\n").filter((l) => l.length > 0).length;
    if (p.added) added += lines;
    if (p.removed) removed += lines;
  }
  const oldLen = oldText.length || 1;
  const newLen = newText.length;
  const sizeDeltaPct = ((newLen - oldLen) / oldLen) * 100;
  const largeReduction = sizeDeltaPct < -20;

  return { parts, added, removed, sizeDeltaPct, largeReduction };
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- promptDiff`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/lib/prompt-diff.ts src/__tests__/lib/promptDiff.test.ts
git commit -m "feat(lib): prompt diff helper with large-reduction detection"
```

---

### Task 17: Prompts list page

**Files:**
- Create: `src/app/(private)/admin/prompts/page.tsx`

- [ ] **Step 1: Create the page**

Create `src/app/(private)/admin/prompts/page.tsx`:

```tsx
import Link from "next/link";
import { Topbar } from "@/components/layout/topbar";
import { PageContainer } from "@/components/page-container";
import { SurfaceCard } from "@/components/surface-card";
import { SectionTitle, SectionDescription } from "@/components/typography";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listPromptConfigs } from "@/db/queries/prompt-configs";
import { PROMPT_KEYS, PROMPT_KEY_LABELS, CRITICAL_PROMPT_KEYS } from "@/lib/prompt-keys";

export default async function PromptsListPage() {
  const rows = await listPromptConfigs();
  const byKey = new Map(rows.map((r) => [r.key, r]));

  const items = PROMPT_KEYS.map((key) => {
    const r = byKey.get(key);
    return {
      key,
      label: PROMPT_KEY_LABELS[key],
      critical: CRITICAL_PROMPT_KEYS.has(key),
      activeVersion: r?.activeVersion ?? null,
      totalVersions: r?.totalVersions ?? 0,
      lastEditedAt: r?.lastEditedAt ?? null,
      isBase: key === "extraction-base",
    };
  });

  const base = items.find((i) => i.isBase)!;
  const agents = items.filter((i) => !i.isBase).sort((a, b) => a.label.localeCompare(b.label));

  return (
    <>
      <Topbar
        title="Prompts"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Admin", href: "/admin/prompts" },
          { label: "Prompts" },
        ]}
      />
      <PageContainer className="space-y-6">
        <SurfaceCard elevation={1}>
          <div className="space-y-1">
            <SectionTitle>Editar prompts de extração</SectionTitle>
            <SectionDescription>
              Edite os prompts usados pelo pipeline de análise. Cada alteração gera uma nova versão. Teste contra
              uma reserva real antes de publicar. A versão ativa vale para análises futuras (reservas em curso não são afetadas).
            </SectionDescription>
          </div>

          <SurfaceCard elevation={2} className="border-amber-500/40 bg-amber-500/5">
            <div className="flex items-center justify-between gap-4 py-3">
              <div className="flex items-center gap-3">
                <Badge variant="secondary">PRINCIPAL</Badge>
                <div>
                  <div className="font-medium">{base.label}</div>
                  <div className="text-xs text-muted-foreground">
                    Aplicado antes de cada um dos 13 prompts específicos — contém as regras gerais do pipeline.
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span>v{base.activeVersion ?? "—"}</span>
                <span className="text-muted-foreground">{base.totalVersions} versões</span>
                <Button asChild size="sm">
                  <Link href={`/admin/prompts/${base.key}`}>Editar</Link>
                </Button>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard elevation={2}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 pl-2">Agente</th>
                  <th className="py-2">Flags</th>
                  <th className="py-2">Ativa</th>
                  <th className="py-2">Versões</th>
                  <th className="py-2">Última edição</th>
                  <th className="py-2 pr-2"></th>
                </tr>
              </thead>
              <tbody>
                {agents.map((a) => (
                  <tr key={a.key} className="border-b border-border-subtle last:border-0">
                    <td className="py-2 pl-2 font-medium">{a.label}</td>
                    <td className="py-2">
                      {a.critical && <Badge variant="destructive">REGRAS DE NEGÓCIO</Badge>}
                    </td>
                    <td className="py-2 tabular-nums">v{a.activeVersion ?? "—"}</td>
                    <td className="py-2 tabular-nums">{a.totalVersions}</td>
                    <td className="py-2 text-muted-foreground">
                      {a.lastEditedAt ? new Date(a.lastEditedAt).toLocaleString("pt-BR") : "—"}
                    </td>
                    <td className="py-2 pr-2 text-right">
                      <Button asChild size="sm" variant="secondary">
                        <Link href={`/admin/prompts/${a.key}`}>Editar</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SurfaceCard>
        </SurfaceCard>
      </PageContainer>
    </>
  );
}
```

- [ ] **Step 2: Manual smoke test**

Run: `npm run dev`, navegue pra `http://localhost:3000/admin/prompts` logado como admin.
Expected: ver a linha destacada do "Prompt Principal" em cima + 13 agentes listados. Badge vermelha em `quadro-resumo-agent` e `fluxo-agent`.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(private\)/admin/prompts/page.tsx
git commit -m "feat(ui): prompts list page with critical badges"
```

---

### Task 18: Editor page — server shell

**Files:**
- Create: `src/app/(private)/admin/prompts/[key]/page.tsx`

- [ ] **Step 1: Create the server shell**

Create `src/app/(private)/admin/prompts/[key]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { Topbar } from "@/components/layout/topbar";
import { PageContainer } from "@/components/page-container";
import { getPromptByKey } from "@/db/queries/prompt-configs";
import { isPromptKey, PROMPT_KEY_LABELS, CRITICAL_PROMPT_KEYS } from "@/lib/prompt-keys";
import { PROMPT_DEFAULTS } from "@/ai/_base/prompt-defaults";
import { PromptEditor } from "./editor";

export default async function PromptEditPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  if (!isPromptKey(key)) {
    notFound();
  }

  const { versions, active } = await getPromptByKey(key);
  const activeContent = active?.content ?? PROMPT_DEFAULTS[key];
  const activeVersion = active?.version ?? 0;

  return (
    <>
      <Topbar
        title={PROMPT_KEY_LABELS[key]}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Admin", href: "/admin/prompts" },
          { label: "Prompts", href: "/admin/prompts" },
          { label: PROMPT_KEY_LABELS[key] },
        ]}
      />
      <PageContainer>
        <PromptEditor
          promptKey={key}
          label={PROMPT_KEY_LABELS[key]}
          critical={CRITICAL_PROMPT_KEYS.has(key)}
          initialContent={activeContent}
          activeVersion={activeVersion}
          versions={versions.map((v) => ({
            id: v.id,
            version: v.version,
            isActive: v.isActive,
            isDefault: v.isDefault,
            content: v.content,
            notes: v.notes,
            createdAt: v.createdAt.toISOString(),
            activatedAt: v.activatedAt?.toISOString() ?? null,
          }))}
        />
      </PageContainer>
    </>
  );
}
```

- [ ] **Step 2: Commit after editor is done** (continua na próxima task)

---

### Task 19: Editor client component

**Files:**
- Create: `src/app/(private)/admin/prompts/[key]/editor.tsx`

- [ ] **Step 1: Create the client editor**

Create `src/app/(private)/admin/prompts/[key]/editor.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SurfaceCard } from "@/components/surface-card";
import { HistorySidebar, type VersionRow } from "./history-sidebar";
import { DiffModal } from "./diff-modal";
import { TestPanel } from "./test-panel";

type Props = {
  promptKey: string;
  label: string;
  critical: boolean;
  initialContent: string;
  activeVersion: number;
  versions: VersionRow[];
};

export function PromptEditor({
  promptKey,
  critical,
  initialContent,
  activeVersion,
  versions: initialVersions,
}: Props) {
  const [content, setContent] = useState(initialContent);
  const [notes, setNotes] = useState("");
  const [versions, setVersions] = useState(initialVersions);
  const [loadedVersion, setLoadedVersion] = useState<number>(activeVersion);
  const [isPending, startTransition] = useTransition();
  const [diffOpen, setDiffOpen] = useState(false);
  const [pendingActivate, setPendingActivate] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const activeContent = versions.find((v) => v.isActive)?.content ?? initialContent;
  const dirty = content !== activeContent || notes.length > 0;

  async function saveDraft() {
    setStatus(null);
    const res = await fetch(`/api/admin/prompts/${promptKey}`, {
      method: "POST",
      body: JSON.stringify({ content, notes: notes || undefined }),
    });
    if (!res.ok) {
      setStatus(`Erro ao salvar: ${res.status}`);
      return;
    }
    const { version, id } = await res.json();
    setStatus(`Rascunho v${version} salvo.`);
    setLoadedVersion(version);
    setVersions((prev) => [
      {
        id,
        version,
        isActive: false,
        isDefault: false,
        content,
        notes: notes || null,
        createdAt: new Date().toISOString(),
        activatedAt: null,
      },
      ...prev,
    ]);
    setNotes("");
  }

  function openPublishFlow(versionNumber: number) {
    setPendingActivate(versionNumber);
    setDiffOpen(true);
  }

  async function confirmPublish() {
    if (pendingActivate == null) return;
    setDiffOpen(false);
    startTransition(async () => {
      const res = await fetch(`/api/admin/prompts/${promptKey}/activate`, {
        method: "POST",
        body: JSON.stringify({ version: pendingActivate }),
      });
      if (!res.ok) {
        setStatus(`Erro ao publicar: ${res.status}`);
        return;
      }
      setStatus(`v${pendingActivate} publicada.`);
      setVersions((prev) =>
        prev.map((v) => ({
          ...v,
          isActive: v.version === pendingActivate,
          activatedAt: v.version === pendingActivate ? new Date().toISOString() : v.activatedAt,
        })),
      );
      setPendingActivate(null);
    });
  }

  function cloneFromVersion(v: VersionRow) {
    setContent(v.content);
    setLoadedVersion(v.version);
    setStatus(`Carregado v${v.version} no editor. Edite e clique em "Salvar rascunho".`);
  }

  const draftVersion = versions.find((v) => !v.isActive && v.content === content && v.version === loadedVersion);
  const candidateForPublish = draftVersion ?? (loadedVersion !== activeVersion ? { version: loadedVersion, content } : null);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-4">
        <SurfaceCard elevation={1}>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge>{loadedVersion === activeVersion ? `ATIVA v${activeVersion}` : `v${loadedVersion}`}</Badge>
              {critical && <Badge variant="destructive">REGRAS DE NEGÓCIO</Badge>}
              {dirty && <Badge variant="outline">não salvo</Badge>}
            </div>
            {status && <span className="text-xs text-muted-foreground">{status}</span>}
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="h-[500px] w-full rounded border border-border-subtle bg-surface-elevated p-3 font-mono text-sm"
            spellCheck={false}
          />

          <div className="mt-3 flex items-center gap-2">
            <Input
              placeholder="Notas (opcional) — ex: 'ajuste mãe/pai'"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Button size="sm" onClick={saveDraft} disabled={!dirty || isPending}>
              Salvar rascunho
            </Button>
            <Button
              size="sm"
              variant="default"
              disabled={!candidateForPublish || isPending}
              onClick={() => candidateForPublish && openPublishFlow(candidateForPublish.version)}
            >
              Publicar esta versão
            </Button>
          </div>
        </SurfaceCard>

        <TestPanel promptKey={promptKey} draftContent={content} />
      </div>

      <HistorySidebar versions={versions} onClone={cloneFromVersion} onPublish={openPublishFlow} />

      {diffOpen && pendingActivate !== null && (
        <DiffModal
          critical={critical}
          oldContent={activeContent}
          newContent={versions.find((v) => v.version === pendingActivate)?.content ?? content}
          targetVersion={pendingActivate}
          onCancel={() => {
            setDiffOpen(false);
            setPendingActivate(null);
          }}
          onConfirm={confirmPublish}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(private\)/admin/prompts/\[key\]/page.tsx src/app/\(private\)/admin/prompts/\[key\]/editor.tsx
git commit -m "feat(ui): prompt editor page and client component"
```

---

### Task 20: History sidebar component

**Files:**
- Create: `src/app/(private)/admin/prompts/[key]/history-sidebar.tsx`

- [ ] **Step 1: Create the sidebar**

Create `src/app/(private)/admin/prompts/[key]/history-sidebar.tsx`:

```tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/surface-card";

export type VersionRow = {
  id: string;
  version: number;
  isActive: boolean;
  isDefault: boolean;
  content: string;
  notes: string | null;
  createdAt: string;
  activatedAt: string | null;
};

type Props = {
  versions: VersionRow[];
  onClone: (v: VersionRow) => void;
  onPublish: (version: number) => void;
};

export function HistorySidebar({ versions, onClone, onPublish }: Props) {
  return (
    <SurfaceCard elevation={1} className="h-fit space-y-2">
      <div className="text-sm font-semibold">Histórico</div>
      <ul className="space-y-2">
        {versions.map((v) => (
          <li
            key={v.id}
            className="rounded border border-border-subtle bg-surface-elevated p-2 text-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="font-mono">v{v.version}</span>
                {v.isActive && <Badge variant="secondary">ATIVA</Badge>}
                {v.isDefault && <Badge variant="outline">DEFAULT</Badge>}
              </div>
              <span className="text-muted-foreground">
                {new Date(v.createdAt).toLocaleDateString("pt-BR")}
              </span>
            </div>
            {v.notes && <div className="mt-1 text-muted-foreground">&ldquo;{v.notes}&rdquo;</div>}
            <div className="mt-2 flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => onClone(v)}>
                Clonar
              </Button>
              {!v.isActive && (
                <Button size="sm" variant="ghost" onClick={() => onPublish(v.version)}>
                  Publicar
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </SurfaceCard>
  );
}
```

- [ ] **Step 2: Commit** (agrupado com o diff modal)

---

### Task 21: Diff modal with critical-key confirmation

**Files:**
- Create: `src/app/(private)/admin/prompts/[key]/diff-modal.tsx`

- [ ] **Step 1: Create the modal**

Create `src/app/(private)/admin/prompts/[key]/diff-modal.tsx`:

```tsx
"use client";

import { useState, useMemo } from "react";
import { computePromptDiff } from "@/lib/prompt-diff";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

type Props = {
  critical: boolean;
  oldContent: string;
  newContent: string;
  targetVersion: number;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DiffModal({ critical, oldContent, newContent, targetVersion, onCancel, onConfirm }: Props) {
  const diff = useMemo(() => computePromptDiff(oldContent, newContent), [oldContent, newContent]);
  const [confirmed, setConfirmed] = useState(!critical);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
      <div className="w-full max-w-4xl rounded-lg border border-border-subtle bg-surface-elevated p-6 shadow-xl">
        <h2 className="text-lg font-semibold">Publicar v{targetVersion}?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Isso afeta a próxima análise do pipeline imediatamente. Reservas em curso continuam com a versão anterior.
        </p>

        <div className="mt-3 flex items-center gap-3 text-xs">
          <span className="text-green-500">+{diff.added} linhas</span>
          <span className="text-red-500">−{diff.removed} linhas</span>
          <span className="text-muted-foreground">
            Δ tamanho: {diff.sizeDeltaPct >= 0 ? "+" : ""}
            {diff.sizeDeltaPct.toFixed(1)}%
          </span>
        </div>

        {diff.largeReduction && (
          <div className="mt-3 rounded border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
            Atenção: prompt reduziu significativamente — verifique se nenhuma regra de negócio foi removida.
          </div>
        )}

        <div className="mt-4 max-h-[400px] overflow-auto rounded border border-border-subtle bg-background font-mono text-xs">
          {diff.parts.map((p, i) => (
            <pre
              key={i}
              className={`whitespace-pre-wrap px-2 py-0.5 ${
                p.added
                  ? "bg-green-500/10 text-green-700 dark:text-green-400"
                  : p.removed
                    ? "bg-red-500/10 text-red-700 dark:text-red-400"
                    : "text-muted-foreground"
              }`}
            >
              {p.added ? "+ " : p.removed ? "− " : "  "}
              {p.value}
            </pre>
          ))}
        </div>

        {critical && (
          <label className="mt-4 flex items-center gap-2 text-sm">
            <Checkbox checked={confirmed} onCheckedChange={(v) => setConfirmed(Boolean(v))} />
            Revisei o diff e confirmo que regras de empreendimento não foram quebradas.
          </label>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button disabled={!confirmed} onClick={onConfirm}>
            Publicar
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit history sidebar + diff modal**

```bash
git add src/app/\(private\)/admin/prompts/\[key\]/history-sidebar.tsx src/app/\(private\)/admin/prompts/\[key\]/diff-modal.tsx
git commit -m "feat(ui): history sidebar and diff modal for prompt editor"
```

---

### Task 22: Test panel

**Files:**
- Create: `src/app/(private)/admin/prompts/[key]/test-panel.tsx`

- [ ] **Step 1: Create the test panel**

Create `src/app/(private)/admin/prompts/[key]/test-panel.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SurfaceCard } from "@/components/surface-card";
import { PROMPT_KEYS, type PromptKey } from "@/lib/prompt-keys";

type Props = {
  promptKey: string;
  draftContent: string;
};

type TestResult = {
  ok?: boolean;
  output?: unknown;
  rawOutput?: string;
  error?: string;
  provider?: string;
  model?: string;
  latencyMs?: number;
};

const TARGET_OPTIONS = PROMPT_KEYS.filter((k) => k !== "extraction-base");

export function TestPanel({ promptKey, draftContent }: Props) {
  const [idReserva, setIdReserva] = useState("");
  const [targetAgent, setTargetAgent] = useState<PromptKey>("cnh-agent");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isBase = promptKey === "extraction-base";

  async function runTest() {
    setLoading(true);
    setError(null);
    setResult(null);
    const body: Record<string, unknown> = {
      content: draftContent,
      idReserva: Number(idReserva),
    };
    if (isBase) body.targetAgent = targetAgent;
    try {
      const res = await fetch(`/api/admin/prompts/${promptKey}/test`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : JSON.stringify(json.error));
      } else {
        setResult(json);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SurfaceCard elevation={1}>
      <div className="text-sm font-semibold">Testar rascunho contra reserva real</div>
      <div className="mt-2 flex items-center gap-2">
        <Input
          placeholder="idReserva do CVCRM"
          value={idReserva}
          onChange={(e) => setIdReserva(e.target.value.replace(/\D/g, ""))}
          className="h-8 w-[200px] text-sm"
        />
        {isBase && (
          <select
            value={targetAgent}
            onChange={(e) => setTargetAgent(e.target.value as PromptKey)}
            className="h-8 rounded border border-border-subtle bg-surface-elevated px-2 text-sm"
          >
            {TARGET_OPTIONS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        )}
        <Button size="sm" onClick={runTest} disabled={!idReserva || loading}>
          {loading ? "Rodando..." : "Rodar teste"}
        </Button>
      </div>

      {error && (
        <div className="mt-3 rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-3 space-y-2 text-xs">
          <div className="flex items-center gap-3 text-muted-foreground">
            <span>status: {result.ok ? "ok" : "falha"}</span>
            <span>provider: {result.provider}</span>
            <span>model: {result.model}</span>
            <span>{result.latencyMs}ms</span>
          </div>
          <pre className="max-h-[400px] overflow-auto rounded border border-border-subtle bg-background p-3 font-mono">
{JSON.stringify(result.output ?? result.rawOutput, null, 2)}
          </pre>
        </div>
      )}
    </SurfaceCard>
  );
}
```

- [ ] **Step 2: Manual smoke test**

Run: `npm run dev`
Acesse `/admin/prompts/cnh-agent`. Edite o textarea. Salve rascunho. No histórico, a nova versão aparece. Cole um `idReserva` real e rode teste. Veja o JSON de saída. Clique em "Publicar esta versão" na nova versão → modal mostra diff.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(private\)/admin/prompts/\[key\]/test-panel.tsx
git commit -m "feat(ui): test panel — run draft prompt against real reserva"
```

---

## Phase I — End-to-end verification

### Task 23: Smoke test + docs update

**Files:**
- Modify: `CLAUDE.md` (seção Arquitetura — adicionar referência breve à feature)

- [ ] **Step 1: Apply migrations + seed na DB dev**

Run:
```bash
npm run db:push
npx tsx scripts/seed-admin-role.ts
npx tsx scripts/seed-prompt-configs.ts
```

- [ ] **Step 2: Rodar toda a suite de testes**

Run: `npm test`
Expected: 0 failures.

- [ ] **Step 3: Smoke test manual no browser**

1. Login como admin.
2. Navegar `/admin/prompts` → 14 itens, base destacado, 2 com badge vermelha.
3. Editar `cnh-agent`, salvar rascunho → histórico mostra v2.
4. Rodar teste com um `idReserva` real → JSON aparece.
5. Clicar em "Publicar v2" → modal com diff visual.
6. Confirmar → status "v2 publicada".
7. Disparar webhook de reprocess dessa reserva.
8. Verificar `reservation_audits.prompt_version` da nova análise = `"base:v1|cnh-agent:v2"`.

Query de verificação:
```sql
SELECT prompt_version, created_at
FROM reservation_audits
ORDER BY created_at DESC
LIMIT 5;
```

- [ ] **Step 4: Logout e login como auditor**

Se não tiver auditor ainda, crie via `/register`. Tente acessar `/admin/prompts` → redireciona pra `/dashboard`. Sidebar não mostra item "Prompts".

- [ ] **Step 5: Update `CLAUDE.md`** (adicione no final da seção "Arquitetura"):

```md
### Editable Prompts (admin)

Os 14 prompts de extração (`extraction-base` + 13 agentes) são editáveis em `/admin/prompts` por usuários com `role='admin'`. Runtime: `analyzeContract()` chama `snapshotPrompts()` 1x no início e passa override imutável pras 4 fases — reservas em curso nunca pegam nova versão. `reservation_audits.prompt_version` grava `"base:vN|<agente>:vM"`.
```

- [ ] **Step 6: Final commit**

```bash
git add CLAUDE.md
git commit -m "docs: add editable prompts section to architecture overview"
```

---

## Self-Review

**Spec coverage:**
- §1 Autorização → Task 1 (role), Task 6 (requireAdmin), Task 15 (layout + sidebar). ✓
- §2 Modelo de dados → Task 2 (table), Task 4 (queries), Task 5 (seed). ✓
- §3 Runtime → Task 7 (loadPrompt/snapshotPrompts), Task 10 (orchestrator). ✓
- §4 API routes → Tasks 11, 12, 13, 14. ✓
- §5 UI → Tasks 15 (layout/sidebar), 17 (list), 18 (server shell), 19 (editor), 20 (history), 21 (diff), 22 (test). ✓
- §6 Testes → cobertos em cada task. ✓
- Migrations → Tasks 1 e 2 (via Drizzle). ✓
- Diff modal com checkbox pra critical → Task 21. ✓
- Snapshot imutável por pipeline → Task 7 (Object.freeze) + Task 10 (chamado 1x). ✓
- Audit trail activated_by/activated_at/deactivated_at → Task 2 (schema) + Task 4 (activateVersion transaction). ✓
- Badge REGRAS DE NEGÓCIO → Task 3 (constant) + Task 17 (list render). ✓

**Placeholder scan:** nenhum TBD/TODO encontrado. Comandos e código completos em todos os steps. ✓

**Type consistency:**
- `PromptKey` definida em Task 3, usada consistentemente em Tasks 4, 7, 9, 10, 11-14.
- `PromptSnapshot` / `PromptSnapshotEntry` definidos em Task 7, usados em Task 10.
- `AgentRunOptions.promptOverride` adicionado em Task 8, consumido nos runners Task 9 e no orchestrator Task 10.
- `activateVersion({ key, version, activatedBy })` signature definida em Task 4, usada em Task 13.
- `PROMPT_KEYS` / `CRITICAL_PROMPT_KEYS` / `PROMPT_KEY_LABELS` / `isPromptKey` — definidos em Task 3, usados em Tasks 5, 7, 10, 11-14, 17, 18, 22.

Sem inconsistências encontradas.
