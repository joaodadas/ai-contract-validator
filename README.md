# Lyx Contract Intelligence

Plataforma inteligente de gestão e análise de contratos.

Motor de validação com IA para processamento de reservas, extração de dados, aplicação de regras de negócio e auditoria completa.

## 📚 Documentação

- **[QUICK_START.md](./QUICK_START.md)** — Setup rápido em 5 minutos
- **[DATABASE_SETUP.md](./DATABASE_SETUP.md)** — Guia completo do banco de dados

## Stack

- **Next.js 16** - Framework React com App Router
- **TypeScript** - Tipagem estática
- **Tailwind CSS v4** - Framework CSS utilitário
- **shadcn/ui** - Componentes UI (estilo new-york)
- **Drizzle ORM** - ORM TypeScript para PostgreSQL
- **PostgreSQL** - Banco de dados relacional
- **bcrypt** - Hash de senhas
- **iron-session** - Gerenciamento de sessões

## Estrutura do Projeto

```
src/
├── app/
│   ├── (public)/           # Rotas públicas (sem autenticação)
│   │   ├── login/
│   │   └── register/
│   └── (private)/          # Rotas privadas (requer autenticação)
│       ├── dashboard/
│       ├── reservas/       # Gestão de contratos
│       ├── regras/         # Configuração de regras
│       └── logs/           # Auditoria e logs
├── components/
│   ├── layout/             # Sidebar, Topbar, AppShell
│   ├── ui/                 # Componentes shadcn/ui
│   ├── typography.tsx      # Sistema de tipografia
│   ├── surface-card.tsx    # Cards com elevation
│   └── status-badge.tsx    # Badges semânticos
├── db/
│   ├── schema.ts           # Schema completo (auth + reservas)
│   ├── index.ts            # Conexão do Drizzle
│   ├── migrate.ts          # Script de migração
│   ├── seed.ts             # Dados iniciais
│   └── queries.example.ts  # Exemplos de queries
├── lib/
│   ├── auth/
│   │   ├── session.ts      # Gerenciamento de sessões
│   │   └── password.ts     # Hash e verificação de senhas
│   └── utils.ts
└── middleware.ts           # Proteção de rotas (edge-compatible)
```

## Setup

### 1. Clone o repositório

```bash
git clone git@github.com:Tecnologia-Lyx/lyx-contract-intelligence.git
cd lyx-contract-intelligence
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Copie o arquivo `.env.local.example` para `.env.local`:

```bash
cp .env.local.example .env.local
```

Edite o `.env.local` e configure:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
SESSION_SECRET=your-session-secret-key-min-32-chars
```

### 4. Configure o banco de dados

Execute as migrações do Drizzle:

```bash
# Gerar migrações
npm run db:generate

# Aplicar migrações
npm run db:migrate

# Ou usar push para desenvolvimento rápido
npm run db:push
```

### 5. Execute o projeto

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador.

## Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Cria build de produção
- `npm run start` - Inicia servidor de produção
- `npm run lint` - Executa o linter
- `npm run db:generate` - Gera migrações do Drizzle
- `npm run db:migrate` - Aplica migrações
- `npm run db:push` - Push direto ao banco (dev)
- `npm run db:studio` - Abre Drizzle Studio

## Autenticação

O sistema usa autenticação baseada em sessões:

- Senhas são hashadas com bcrypt (10 rounds)
- Sessões são armazenadas no banco de dados
- Cookies httpOnly para segurança
- Middleware protege rotas privadas automaticamente

## Desenvolvimento

### Adicionar novos componentes shadcn/ui

```bash
npx shadcn@latest add button
```

### Modificar schema do banco

1. Edite `src/db/schema.ts`
2. Gere as migrações: `npm run db:generate`
3. Aplique as migrações: `npm run db:migrate`

## Deploy

Este projeto pode ser deployado na Vercel, Netlify, ou qualquer plataforma que suporte Next.js.

Não esqueça de configurar as variáveis de ambiente na plataforma de deploy.
