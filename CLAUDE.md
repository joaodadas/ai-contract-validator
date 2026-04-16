# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Sobre o Projeto

Plataforma de validação inteligente de contratos imobiliários que substitui um workflow N8N manual. Recebe reservas do CVCRM (CRM imobiliário da Lyx Engenharia), analisa documentos com 14 agentes de IA especializados, faz cross-validation, e apresenta resultados numa interface onde auditores revisam e aprovam.

## Stack

- **Framework**: Next.js 16 (App Router, React Server Components)
- **Linguagem**: TypeScript (strict)
- **Database**: Supabase (PostgreSQL) via Drizzle ORM
- **AI**: Vercel AI SDK com Google Gemini 2.5 Pro (primary), Gemini 2.5 Flash (fallback)
- **UI**: Tailwind CSS 4, Radix UI, Lucide Icons, shadcn/ui
- **Auth**: Custom session-based (bcryptjs + PostgreSQL sessions + httpOnly cookie)
- **Deploy**: Vercel

## Comandos

```bash
npm run dev              # Dev server (localhost:3000)
npm run build            # Build de produção
npm run lint             # ESLint
npm test                 # Jest (todos os testes)
npm test -- --watch      # Jest watch mode
npm test -- path/file    # Rodar um teste específico
npm run db:generate      # Gerar migrations Drizzle
npm run db:migrate       # Aplicar migrations
npm run db:push          # Push schema direto (dev)
npm run db:studio        # Drizzle Studio (GUI)
npm run sync             # Sincronizar reservas do CVCRM
npm run tunnel           # Ngrok tunnel para webhooks
```

## Arquitetura

### Fluxo Principal

```
CVCRM webhook (POST /api/automacao_contratos)
  → processarReserva() [services/reservation.service.ts]
    → Fetch reservation + contracts + documents da API do CV
    → Upsert no banco (externalId = idempotente)
    → runAgentAnalysis()
      → Phase 1: 14 agentes de extração em paralelo
      → Phase 2: Comparação financeira (Fluxo vs Quadro Resumo) — determinístico
      → Phase 3: Validação de planta (bloco/unidade) — determinístico
      → Phase 4: Cross-validation com LLM (reconcilia tudo)
    → Sync resultado de volta ao CVCRM (mensagem + status)
```

O webhook retorna 200 imediatamente — processamento roda em background via `after()` do Next.js.

### Multi-Agent AI System (`src/ai/`)

**Padrão de cada agente** (`src/ai/agents/{nome}/`):
- `agent.ts` — Função runner que chama `runAgent<T>()`
- `schema.ts` — Schema Zod que valida output do LLM
- `prompt.ts` — System prompt com regras específicas do documento

**Retry strategy** (`src/ai/_base/runAgent.ts`):
1. `google_pro` (gemini-2.5-pro) — 2 tentativas (raw + fix instruction)
2. `google_flash_25` (gemini-2.5-flash) — 1 tentativa fallback

**14 agentes**: cnh, rgcpf, ato, quadro-resumo, fluxo, planta, comprovante-residencia, declaracao-residencia, certidao-estado-civil, termo, carteira-trabalho, comprovante-renda, carta-fiador, validation (cross-validation).

**Orchestrator** (`src/ai/orchestrator/contractOrchestrator.ts`):
- `analyzeContract()` — Entry point, roda as 4 fases
- `mapDocumentsToAgents()` — Mapeia DocumentContent[] → agentes via `AGENT_DOCUMENT_TYPES` e `AGENT_CONTRACT_NAMES` em `src/lib/cvcrm/constants.ts`

**Validações determinísticas** (`src/ai/validation/`):
- `financial-comparison.ts` — Compara valores Fluxo vs Quadro (tolerância R$ 1.00)
- `planta-validation.ts` — Valida bloco/unidade contra dados da reserva
- `document-completeness.ts` — Checa grupos obrigatórios de documentos

### CVCRM Integration (`src/lib/cvcrm/`)

- `client.ts` — HTTP client (auth via headers `email` + `token`, não Bearer)
- `types.ts` — Tipos da API do CV + tipos normalizados (`ReservaProcessada`, `Pessoa`)
- `constants.ts` — Mapeamento documento→agente, grupos obrigatórios
- `documentDownloader.ts` — Download de PDFs/imagens (max 5 simultâneos, 30s timeout, 20MB max)

APIs do CV usadas: `GET /api/cvio/reserva/{id}`, `GET .../contratos`, `GET .../documentos`, `POST .../alterar-situacao`, `POST .../mensagens`.

### Regras de Negócio — Sync com CVCRM

**O sistema DEVE sempre notificar o CVCRM após análise. Reservas nunca devem ficar "travadas" sem notificação.**

#### Cenários de sync (`reservation.service.ts`):

**1. Análise OK, sem divergências → situação 38**
- `enviarMensagem(idReserva, "Nenhuma divergência encontrada")`
- `alterarSituacao(idReserva, 38, "Contrato Validado", "Validado por IA")`

**2. Análise com divergências → situação 39**
- `enviarMensagem(idReserva, formattedReport)` — relatório detalhado das divergências
- `alterarSituacao(idReserva, 39, "Contrato com Pendencia", "Validado por IA")`

**3. Documentos obrigatórios faltando → situação 40**
- `enviarMensagem(idReserva, completeness.message)` — lista dos documentos faltantes
- `alterarSituacao(idReserva, 40, "Contrato com Pendencia", "Validado por IA")`

**4. Validation-agent falha (formattedReport undefined)**
- Sync DEVE acontecer mesmo assim — usa mensagem fallback
- Classificar como divergente (situação 39) — nunca aprovar sem validação completa

**5. Erro fatal na pipeline**
- Sync DEVE acontecer — envia mensagem de erro ao CVCRM
- `alterarSituacao(idReserva, 39, "Contrato com Pendencia", "Validado por IA")`

**Parâmetros de `enviarMensagem`** (padrão para todos os cenários):
- `exibir_imobiliaria: true`
- `enviar_email_imobiliaria: true`
- `enviar_email_corretor: true`
- `exibir_correspondente: true`
- `enviar_email_correspondente: true`
- `exibir_repasse: false`

**IMPORTANTE**: `CVCRM_SYNC_ENABLED` deve ser `true` em produção. Em dev/test, fica `false` para não enviar dados reais.

#### Status da reserva no banco:
- `pending` → análise em andamento
- `approved` → IA aprovou (sem divergências, sem falhas)
- `divergent` → IA encontrou divergências OU agentes falharam OU formattedReport undefined
- `confirmed` → auditor humano confirmou manualmente via interface

#### Ações disponíveis na interface:
- **Confirmar e Aprovar** — muda status para `confirmed`, sincroniza com CVCRM
- **Aprovar Manualmente** — override quando status é `divergent` (ignora divergências da IA)
- **Reprocessar Análise** — re-executa toda a análise usando snapshot existente, atualiza CVCRM

### Auth & Routes

- **Rotas públicas**: `(public)/login`, `(public)/register` — Server actions com FormData
- **Rotas privadas**: `(private)/dashboard`, `reservas`, `reservas/[id]`, `regras`, `logs`, `settings` — Auth check no layout via `getSession()`
- **Session**: Cookie `"session"` → lookup na tabela `sessions` → 30 dias de duração
- **Sem middleware.ts** — Auth é validada no layout do route group `(private)`

### Database (`src/db/`)

**Tabelas principais** (schema em `src/db/schema.ts`):
- `users` / `sessions` — Auth
- `reservations` — `externalId` (unique, idReserva do CV), `cvcrmSnapshot` (JSONB completo), `status` (pending→approved|divergent→confirmed)
- `reservation_audits` — Resultados de cada análise IA (`resultJson`, `aiRawOutput`, `executionTimeMs`)
- `rule_configs` — Regras dinâmicas de validação (financial, documents, score, enterprise_override)
- `audit_logs` — Logs detalhados por auditoria (info, warning, error)

**Queries**: `src/db/queries.ts` — `getFilteredReservations()`, `getReservationStats()`, `insertReservationAudit()`, etc.

### Testes — OBRIGATÓRIO

**Regra: toda alteração de código DEVE incluir testes. Sem exceção.**

- Jest + ts-jest, test environment: node
- Path alias `@/*` configurado no `jest.config.js`
- Setup em `src/__tests__/setup.ts` (seta env vars, `CVCRM_SYNC_ENABLED=false`)
- Rodar `npm test` antes de qualquer commit — todos os testes devem passar

**Estrutura de testes** (`src/__tests__/`):
- `services/` — Testes de service layer (reservation.service.ts)
- `api/` — Testes de API routes (webhook, confirm, reprocess, status)
- `ai/orchestrator/` — Pipeline completo, fases, cross-validation
- `ai/validation/` — Financial comparison, planta, document completeness, report formatter
- `ai/agents/` — Schemas Zod de cada agente
- `lib/cvcrm/` — Client HTTP, constants, document downloader

**Tipos de teste por camada:**
1. **Service layer** (unit): Mocka DB + APIs externas, testa lógica de negócio, fluxos de sync, tratamento de erro
2. **API routes** (unit): Mocka service + auth, testa HTTP status codes, validação de body, auth guards
3. **Orchestrator** (unit): Mocka agentes, testa pipeline, fases, fallbacks
4. **Validação** (unit): Testes determinísticos sem mocks — financial, planta, completeness
5. **Client CVCRM** (unit): Mocka fetch global, testa payload e parâmetros enviados à API

**Ao criar/modificar código, os testes devem cobrir:**
- Caminho feliz (happy path)
- Erros de entrada (validação, campos faltando)
- Falhas externas (API down, timeout, resposta inesperada)
- Edge cases (undefined, null, arrays vazios, limites)
- Resiliência (erros não devem propagar quando tratados com try/catch)
- Parâmetros exatos enviados a APIs externas (CVCRM)

**Ao adicionar uma API route:** testar auth 401, body inválido 400, campos faltando 400, sucesso 200, erros de negócio 422
**Ao adicionar uma service function:** testar not found, status inválido, sucesso com e sem sync, falha do sync não propaga
**Ao alterar sync com CVCRM:** testar parâmetros exatos de `enviarMensagem` e `alterarSituacao` (situação, descricao, comentario)

## Boas Práticas

### Git & PRs
- **Conventional Commits**: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`
- **Branches**: `feat/descricao`, `fix/descricao`, `refactor/descricao`
- **PRs**: Sempre abrir PR para main, nunca push direto
- **Escopo**: PRs pequenos e focados, 1 responsabilidade por PR

### Código
- TypeScript strict, sem `any`
- Componentes RSC por padrão, `"use client"` só quando necessário
- Validação com Zod nos limites do sistema (API, LLM output)
- Tratamento de erro explícito, nunca silenciar erros
- Nomes de variáveis e funções em inglês, mensagens de UI em português

### AI Agents
- Cada agente segue o padrão: `agent.ts` + `schema.ts` + `prompt.ts`
- Schema Zod valida output do LLM
- Nunca alucinar dados — retornar valores vazios se não encontrado
- Novos agentes: adicionar em `AgentName` type, criar pasta em `agents/`, registrar em `constants.ts`

### Database
- Drizzle ORM para todas as queries
- Migrations versionadas em `drizzle/`
- JSONB para dados flexíveis (snapshots, resultados de IA)
