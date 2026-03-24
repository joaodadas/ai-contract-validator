# Lyx Contract Intelligence

## Sobre o Projeto

Plataforma de validação inteligente de contratos imobiliários que substitui um workflow N8N manual. O sistema recebe reservas do CVCRM (CRM imobiliário da Lyx Engenharia), analisa documentos com múltiplos agentes de IA, faz cross-validation entre documentos, e apresenta resultados numa interface interativa onde auditores podem revisar, aprovar e gerenciar regras de validação.

## Stack

- **Framework**: Next.js 16 (App Router, React Server Components)
- **Linguagem**: TypeScript (strict)
- **Database**: Supabase (PostgreSQL) via Drizzle ORM
- **AI**: Vercel AI SDK com Google Gemini (primary) e Anthropic Claude (fallback)
- **UI**: Tailwind CSS 4, Radix UI, Lucide Icons, shadcn/ui
- **Auth**: iron-session (cookie-based)
- **Deploy**: Vercel

## Estrutura do Projeto

```
src/
├── app/                    # Next.js App Router (pages + API routes)
│   ├── (private)/         # Rotas protegidas por auth
│   │   ├── dashboard/     # Dashboard principal
│   │   └── reservas/      # Listagem e detalhe de reservas
│   └── api/               # API routes (webhook, status, etc.)
├── ai/                    # Multi-agent AI system
│   ├── _base/             # Base runner, LLM config, types
│   ├── agents/            # 14 agentes especializados
│   ├── orchestrator/      # Pipeline de 4 fases
│   └── validation/        # Validações (completude, financeiro, planta)
├── components/            # React components (RSC + client)
├── db/                    # Schema Drizzle + queries
├── lib/                   # Integrações externas (CVCRM)
└── services/              # Business logic (processarReserva)
```

## Comandos

```bash
npm run dev          # Dev server
npm run build        # Build de produção
npm run lint         # ESLint
npm run db:generate  # Gerar migrations Drizzle
npm run db:migrate   # Aplicar migrations
npm run db:push      # Push schema direto (dev)
npm run db:studio    # Drizzle Studio (GUI)
npm run sync         # Sincronizar reservas do CVCRM
npm run tunnel       # Ngrok tunnel para webhooks
```

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
- Estratégia de retry: Google Flash → Google Pro → Claude (fallback)
- Nunca alucinar dados — retornar valores vazios se não encontrado

### Database
- Drizzle ORM para todas as queries
- Migrations versionadas em `drizzle/`
- JSONB para dados flexíveis (snapshots, resultados de IA)
