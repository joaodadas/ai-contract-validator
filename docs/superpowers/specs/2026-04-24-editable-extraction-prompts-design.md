# Editable Extraction Prompts — Admin Panel

**Data:** 2026-04-24
**Status:** Design aprovado
**Autor:** Joao Vitor + Claude

## Contexto

Hoje os 14 prompts do pipeline de extração (`BASE_PROMPT` + 13 prompts específicos por agente em `src/ai/agents/*/prompt.ts`) são constantes TypeScript hardcoded. Qualquer ajuste exige commit → build → deploy. Precisamos permitir que um admin edite os prompts diretamente pela UI, com versionamento, rollback e teste contra reservas reais antes de publicar.

O `validation-agent` (cross-validation) **fica fora** do escopo — a demanda é apenas sobre extração.

## Objetivos

- Admin edita os 14 prompts de extração (base + 13 agentes) pela UI.
- Histórico completo de versões por prompt com rollback em segundos.
- Fluxo rascunho → teste ao vivo contra reserva real → publicar, evitando quebrar produção.
- Versão default (a v1 semeada do código) nunca é sobrescrita.
- Auditores (não-admins) não têm acesso.

## Não-objetivos

- Editar `validation-agent` ou validações determinísticas (`financial-comparison`, `planta-validation`, `document-completeness`).
- Editar schemas Zod ou lógica de retry.
- Editor colaborativo em tempo real.
- Aprovar/publicar fluxo multi-usuário (comments, reviews).

---

## Arquitetura

### 1. Autorização

**Schema:**
- Novo enum Postgres `user_role` com valores `'admin' | 'auditor'`.
- Coluna `role user_role NOT NULL DEFAULT 'auditor'` na tabela `users`.
- Migration de seed: `UPDATE users SET role='admin' WHERE email='dadasjv@hotmail.com'`.

**Runtime:**
- `src/lib/auth/session.ts` ganha helper `requireAdmin()`:
  ```ts
  export async function requireAdmin(): Promise<User> {
    const user = await getSession();
    if (!user) redirect("/login");
    if (user.role !== "admin") throw new Error("Forbidden");
    return user;
  }
  ```
- Usado no `(private)/admin/layout.tsx` (redireciona auditor pra `/dashboard`) e em toda API route `/api/admin/*` (retorna 403).

**UI:**
- Item "Prompts" no sidebar só renderiza se `session.role === 'admin'`.

### 2. Modelo de dados

Nova tabela `prompt_configs`:

```sql
CREATE TABLE prompt_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent varchar(64) NOT NULL,           -- "extraction-base" | "cnh-agent" | ...
  version integer NOT NULL,              -- monotonic per agent, começa em 1
  is_active boolean NOT NULL DEFAULT false,
  is_default boolean NOT NULL DEFAULT false,
  content text NOT NULL,
  notes text,
  created_by integer NOT NULL REFERENCES users(id),
  activated_by integer REFERENCES users(id),       -- quem publicou (pode diferir de created_by)
  activated_at timestamp,                          -- quando foi ativada pela última vez
  deactivated_at timestamp,                        -- quando deixou de ser ativa
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX prompt_configs_agent_version_key ON prompt_configs(agent, version);
CREATE UNIQUE INDEX prompt_configs_agent_active_key ON prompt_configs(agent) WHERE is_active = true;
CREATE UNIQUE INDEX prompt_configs_agent_default_key ON prompt_configs(agent) WHERE is_default = true;
CREATE INDEX prompt_configs_agent_idx ON prompt_configs(agent);
```

Valores válidos para `agent`:
- `"extraction-base"` — o `BASE_PROMPT`
- Os 13 nomes canônicos: `cnh-agent`, `rgcpf-agent`, `ato-agent`, `quadro-resumo-agent`, `fluxo-agent`, `planta-agent`, `comprovante-residencia-agent`, `declaracao-residencia-agent`, `certidao-estado-civil-agent`, `termo-agent`, `carteira-trabalho-agent`, `comprovante-renda-agent`, `carta-fiador-agent`.

**Migration de seed:** insere 14 rows, uma por chave, com `version=1, is_active=true, is_default=true`, `content = <valor hardcoded atual dos arquivos prompt.ts>`, `created_by = id do admin`, `activated_by = id do admin`, `activated_at = now()`.

**Por que tabela nova em vez de estender `rule_configs`:** `rule_configs.config` é JSONB para regras estruturadas com escopo por empreendimento; prompt é texto grande, versionamento é por chave (não por empresa), e a semântica de "um ativo por chave" não casa com `rule_configs`.

**Critério de criticidade** (hardcoded no frontend, não é coluna):
- `quadro-resumo-agent` e `fluxo-agent` recebem badge "REGRAS DE NEGÓCIO" na UI — contêm regras específicas de empreendimento (KENTUCKY 2027, MCMV, COHAPAR, tolerância de parcelas) que não são óbvias só lendo o prompt. Sinaliza cuidado extra ao editar.

### 3. Runtime — como os agentes carregam prompts

**Arquivo novo:** `src/ai/_base/loadPrompt.ts`

```ts
export type PromptKey = "extraction-base" | AgentName;

export async function loadPrompt(key: PromptKey): Promise<{ content: string; version: number }> {
  try {
    const row = await db.query.promptConfigs.findFirst({
      where: and(eq(promptConfigs.agent, key), eq(promptConfigs.isActive, true)),
    });
    if (row) return { content: row.content, version: row.version };
  } catch (err) {
    logger.warn({ err, key }, "prompt lookup failed, using fallback");
  }
  return { content: HARDCODED_FALLBACKS[key], version: 0 };
}

export type PromptSnapshot = Readonly<Record<PromptKey, Readonly<{ content: string; version: number }>>>;

export async function snapshotPrompts(): Promise<PromptSnapshot> {
  // batch query de todas as ativas + fallback
  // retorna Object.freeze({...}) — imutável
}
```

`HARDCODED_FALLBACKS` é um `Record<PromptKey, string>` montado a partir das constantes em `src/ai/_base/basePrompt.ts` e `src/ai/agents/*/prompt.ts` — permanece no código como fonte de verdade do default e fallback de DR.

**Snapshot imutável por pipeline:** `analyzeContract()` chama `snapshotPrompts()` **exatamente uma vez** no início. O objeto retornado é `Object.freeze`'d e passado pelas 4 fases. Isso garante que, se um admin publicar uma nova versão enquanto uma reserva está no meio do pipeline, a reserva em curso continua com as versões que tinha no início — fase 1 e fase 4 nunca rodam com versões diferentes. Ativação de nova versão afeta **próximas** reservas, nunca as em curso.

**Mudança em cada `agent.ts`:** aceita o objeto `{ content, version }` via options, em vez de importar a constante:

```ts
// antes
import { CNH_PROMPT } from "./prompt";
return runAgent({ agent: "cnh-agent", systemPrompt: CNH_PROMPT, ... });

// depois
return runAgent({
  agent: "cnh-agent",
  systemPrompt: prompts.base.content + "\n\n" + prompts.cnh.content,
  promptVersion: `base:v${prompts.base.version}|cnh-agent:v${prompts.cnh.version}`,
  ...
});
```

**`reservation_audits.promptVersion`** passa a armazenar a string composta (ex: `"base:v3|cnh-agent:v5"`). Coluna hoje é `varchar(100)` — cabe.

**Arquivos `prompt.ts` não são mais importados** pelos runners, mas permanecem no repositório como:
1. Fonte de verdade do conteúdo da v1 (usado pela migration de seed).
2. Fallback hardcoded quando DB cai.

### 4. API routes

Todas atrás de `requireAdmin()`, validação Zod no body.

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/admin/prompts` | Lista 14 chaves com `{ key, activeVersion, totalVersions, lastEditedAt, lastEditedBy }` |
| `GET` | `/api/admin/prompts/[key]` | Retorna ativa + histórico completo da chave |
| `POST` | `/api/admin/prompts/[key]` | Body `{ content, notes? }`. Cria nova versão `is_active=false`. Retorna `{ version }` |
| `POST` | `/api/admin/prompts/[key]/activate` | Body `{ version }`. Transação: desativa atual (`is_active=false, deactivated_at=now()`) + ativa alvo (`is_active=true, activated_by=<user_id>, activated_at=now()`, limpa `deactivated_at`). Retorna 200 vazio ou 409 se `version` inexistente |
| `POST` | `/api/admin/prompts/[key]/test` | Body `{ content, idReserva, targetAgent? }`. Para `key="extraction-base"`, `targetAgent` obrigatório. Fetch reserva do CVCRM → filtra documento pelo tipo do agente → baixa → roda `runAgent` com `systemPrompt = <base content> + "\n\n" + <agent content>` usando o `content` do body no lugar apropriado. Não grava nada. Retorna `{ output, rawOutput, latencyMs, provider, error? }` |

**Validação:**
- `key` na URL deve ser uma das 14 chaves válidas (enum check) → 404 se não.
- `content` não-vazio, max 50.000 chars.
- `idReserva` inteiro positivo.
- `targetAgent` só aceita um dos 13 nomes (não `extraction-base`).
- Reserva sem documento do tipo esperado → 422 com mensagem clara.

### 5. UI — `(private)/admin/prompts/`

**`layout.tsx`:** chama `requireAdmin()` no server — auditor é redirecionado pra `/dashboard`.

#### Lista `/admin/prompts`

- Topbar "Administração › Prompts".
- Tabela com 14 linhas. Primeira linha destacada com badge "PRINCIPAL" e fundo sutil diferente — edita `extraction-base`. As outras 13 mostram os agentes em ordem alfabética.
- Colunas: `Nome | Badges | Versão ativa | Total versões | Última edição | Publicado por | Ação`.
- Badge "REGRAS DE NEGÓCIO" (cor âmbar/vermelha) nas linhas `quadro-resumo-agent` e `fluxo-agent` — sinaliza que o prompt contém regras específicas de empreendimento (KENTUCKY 2027, MCMV, COHAPAR) e exige cuidado extra ao editar. Lista hardcoded em constante no frontend.
- Botão "Editar" → `/admin/prompts/[key]`.

#### Editor `/admin/prompts/[key]`

Layout em grid 2/3 + 1/3:

**Coluna principal (editor):**
- `<textarea>` monospace, 500px altura, fonte mono, valor inicial = conteúdo da versão ativa.
- Campo `notes` — 1 linha, opcional.
- Botões: "Salvar rascunho" | "Testar" | "Publicar esta versão" (só habilita em versão não-ativa).
- Acima do editor: badge indicando qual versão está carregada ("Editando v5 ATIVA" ou "Editando v3 (histórico)" ou "Novo rascunho").

**Coluna lateral (histórico):**
- Timeline reversa: versão ativa no topo, depois rascunhos, depois publicações antigas, e v1 DEFAULT no fim.
- Cada item: `v5 • ATIVO • 23/04 14:32 • João • "nota do admin"`.
- Clicar em um item carrega o conteúdo no editor em modo read-only. Botão "Clonar pro editor" transforma em novo rascunho editável.

**Painel de teste (colapsável, embaixo de tudo):**
- Input `idReserva`.
- Se `key === "extraction-base"`: dropdown adicional "Testar com agente [CNH ▾]" (default CNH). Obrigatório — base sozinho não extrai nada.
- Botão "Rodar teste" → 2 chamadas Gemini em paralelo: versão ativa vs rascunho do editor, mesma reserva, mesmo documento.
- Resultado: JSON lado a lado, destaque nas diferenças (lib `jsondiffpatch` ou similar — ou só scroll manual v1).
- Badges de latência e provider usado (google_pro / google_flash_25).

**Modal de confirmação em "Publicar":** obrigatório mostrar **diff lado a lado** entre versão ativa e rascunho antes de confirmar. Gerado com a lib `diff` (npm), renderizado inline:
- Linhas removidas em vermelho, linhas adicionadas em verde.
- Contador topo: `−12 linhas, +8 linhas, Δ tamanho: −4%`.
- Se o rascunho teve redução de > 20% em número de caracteres, warning extra em amarelo: "Atenção: prompt reduziu significativamente — verifique se nenhuma regra de negócio foi removida".
- Para `quadro-resumo-agent` e `fluxo-agent` (badge "REGRAS DE NEGÓCIO"), checkbox obrigatório: "Revisei o diff e confirmo que regras de empreendimento não foram quebradas".
- Texto: "Isso afeta a próxima análise do pipeline imediatamente. Reservas em curso continuam com a versão anterior. Publicar v5 de cnh-agent? [Cancelar] [Publicar]".

**Warning visual (v1 simples):** se o `content` não contém todas as chaves declaradas no schema Zod do agente (regex simples `"nome":` etc), mostrar banner "Atenção: prompt pode não extrair os campos X, Y" — não bloqueia.

**Nav:** item "Prompts" no sidebar entre "Regras" e "Logs", visível só para admin. Ícone Lucide `FileText`.

### 6. Testes

**Unit (`src/__tests__/`):**
- `ai/_base/loadPrompt.test.ts` — retorna ativa / fallback quando DB falha / retorna versão 0 no fallback.
- `ai/_base/snapshotPrompts.test.ts` — retorna snapshot com as 14 chaves ativas; objeto é imutável (`Object.isFrozen === true`); após `snapshotPrompts()` retornar, uma mutação no DB não afeta o snapshot já retornado.
- `db/queries.promptConfigs.test.ts` — criar draft, ativar transacional (flip), tentativa de 2 ativos é rejeitada pelo índice parcial; ativar grava `activated_by`/`activated_at` e desativar grava `deactivated_at`.
- `lib/auth/requireAdmin.test.ts` — admin passa, auditor throw, sem session redireciona.
- `ai/_base/runAgent.test.ts` (existente) — atualizar pra receber `promptVersion` composto.

**API (`src/__tests__/api/admin/`):**
- `prompts/route.test.ts` — 401 sem session, 403 auditor, 200 admin retorna 14 keys.
- `prompts/[key]/route.test.ts` — POST cria versão N+1, GET retorna histórico ordenado desc.
- `prompts/[key]/activate/route.test.ts` — 409 se versão inexistente, transação completa em sucesso.
- `prompts/[key]/test/route.test.ts` — 422 se reserva sem documento, 200 retorna output, verificar que **nenhuma** row em `prompt_configs` ou `reservation_audits` foi criada.

**Orchestrator (`src/__tests__/ai/orchestrator/`):**
- Atualizar testes existentes: pipeline usa prompts do DB quando seed existe; cai no fallback quando tabela vazia.
- Novo: `reservation_audits.promptVersion` grava `"base:vN|agente:vM"`.
- Novo: snapshot é carregado uma única vez por `analyzeContract()` — mockar `snapshotPrompts` e assertar que foi chamado exatamente 1x mesmo com 4 fases.
- Novo: se prompt é ativado no meio do pipeline (mock), fase 4 usa o MESMO snapshot da fase 1 — não a nova versão.
- Regressão: rodar pipeline com prompts da seed produz mesmo output que rodar com imports hardcoded (garante seed == código).

**Integração manual (não automatizada):** após migration, logar como admin, editar prompt CNH, testar contra `idReserva` conhecida, publicar, disparar webhook de reprocess e confirmar que `reservation_audits.prompt_version` reflete a nova versão.

---

## Migrations

1. `NNNN_add_user_role.sql`
   - `CREATE TYPE user_role AS ENUM ('admin', 'auditor');`
   - `ALTER TABLE users ADD COLUMN role user_role NOT NULL DEFAULT 'auditor';`
   - `UPDATE users SET role='admin' WHERE email='dadasjv@hotmail.com';`

2. `NNNN_create_prompt_configs.sql`
   - `CREATE TABLE prompt_configs (...)` conforme §2.
   - Índices conforme §2.

3. `NNNN_seed_prompt_configs.sql` (ou script TS via `tsx`)
   - Insere 14 rows com `content` extraído dos arquivos `prompt.ts`, `is_active=true, is_default=true, version=1, created_by=<admin_id>, activated_by=<admin_id>, activated_at=now()`.

Migrations são geradas via `npm run db:generate` (Drizzle) a partir das mudanças no schema em `src/db/schema.ts`. Os nomes `NNNN_*` acima são placeholders — Drizzle atribui prefixo numérico automaticamente.

---

## Decisões deferidas

- **Editor syntax-highlight:** v1 usa `<textarea>` monospace simples. Se for incômodo, trocar por `@uiw/react-textarea-code-editor` depois.
- **Diff de output JSON no teste:** v1 mostra os dois JSONs stringify lado a lado, sem highlight. Se for útil, adicionar `jsondiffpatch` em iteração futura. (Diff de **conteúdo do prompt** antes de publicar **está no escopo v1** — ver §5 modal de confirmação.)
- **Schema validation estrito no save:** o warning é soft (regex). Se começar a causar problemas de prompts quebrados publicados, endurecer depois.
- **Shadow/canary mode:** rascunho roda em paralelo com a versão ativa em N reservas (pipeline real, mas sem sync CVCRM), comparando outputs antes de virar efetivo. Alta complexidade (requer flag na tabela `reservation_audits` + fork na chamada da fase 1). Fica pra iteração futura — o diff pré-publish e o teste manual cobrem 80% do valor com 10% do esforço.
- **Pipeline completo no teste:** botão "Rodar 4 fases com prompts-rascunho" contra uma reserva. Útil pra validar interação entre agentes e validation-agent, mas UX complexa (vários outputs pra comparar, ~30-60s de execução). Fica pra iteração futura.
- **`validation-agent` no mesmo painel:** o prompt do validation-agent também contém regras de negócio críticas (classificação de divergência grave vs alerta) e deve ser editável pela mesma infra — apenas adicionar `"validation-agent"` à lista de `PromptKey`s e uma 15ª row no seed. Fica fora do escopo v1 por decisão explícita do produto.

---

## Riscos

1. **Prompt ruim publicado quebra todas as análises até alguém perceber.** Mitigação em múltiplas camadas: (a) fluxo rascunho → teste → diff obrigatório no modal de publicação; (b) badge "REGRAS DE NEGÓCIO" em `quadro-resumo` e `fluxo` com checkbox de confirmação; (c) rollback em 1 clique via histórico; (d) `is_default` sempre restaurável.
2. **Admin remove acidentalmente uma regra específica de empreendimento** (ex: tratamento KENTUCKY 2027 em `fluxo-agent`). O prompt não sinaliza criticidade só lendo. Mitigação: diff visual obrigatório + warning de redução > 20% + checkbox de confirmação na badge "REGRAS DE NEGÓCIO". Curto prazo é cultural; médio prazo considerar canary mode.
3. **Teste consome cota Gemini.** Cada teste = 2 chamadas (ativa + rascunho). Aceitável — frequência baixa, é uso interno de admin.
4. **Tabela `users` sem role em produção.** Migration seta default `auditor` para todos; só o email `dadasjv@hotmail.com` vira admin no seed. Novos registros via `register` continuam `auditor` — OK, já que registro é restrito à equipe.
5. **Fallback silencioso pode mascarar bug.** `loadPrompt` loga warning e grava `version: 0` em `promptVersion` — basta monitorar audits com `base:v0` pra detectar.
6. **Reservas em curso não pegam nova versão ativada.** Comportamento intencional (snapshot imutável por pipeline), mas pode confundir admin que publica e espera ver efeito imediato em reserva em andamento. Mitigação: copy do modal de publicação deixa isso explícito ("Reservas em curso continuam com a versão anterior").
