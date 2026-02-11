# Database Setup — Drizzle ORM

Este projeto usa **Drizzle ORM** com **PostgreSQL** seguindo a documentação oficial.

## 📁 Estrutura

```
/src/db/
  ├── schema.ts          # Todas as tabelas e relações
  └── index.ts           # Cliente do banco

/drizzle/                # Pasta gerada para migrations
  ├── 0000_initial.sql
  └── meta/

/drizzle.config.ts       # Configuração do drizzle-kit
```

## 🗄️ Schema Overview

### Tabelas de Autenticação
- `users` — usuários do sistema
- `sessions` — sessões ativas

### Tabelas do Motor de Validação
- `reservations` — reservas/contratos base
- `reservation_audits` — execuções de validação
- `rule_configs` — regras configuráveis
- `audit_logs` — logs de execução

## ⚙️ Configuração Inicial

### 1. Configure as variáveis de ambiente

Copie `.env.local.example` para `.env.local`:

```bash
cp .env.local.example .env.local
```

Edite `.env.local` e configure sua `DATABASE_URL`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/lyx_contract_intelligence
SESSION_SECRET=your-session-secret-min-32-chars
```

### 2. Crie o banco de dados PostgreSQL

```bash
# Usando psql
createdb lyx_contract_intelligence

# Ou via Docker
docker run -d \
  --name lyx-postgres \
  -e POSTGRES_DB=lyx_contract_intelligence \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:16-alpine
```

## 🚀 Workflow de Migrações

### Gerar migrações (após modificar schema.ts)

```bash
npm run db:generate
```

Isso cria arquivos SQL na pasta `/drizzle` baseado nas mudanças no schema.

### Aplicar migrações ao banco

```bash
npm run db:migrate
```

Executa as migrações SQL no banco de dados.

### Push direto (desenvolvimento rápido)

```bash
npm run db:push
```

Aplica mudanças direto no banco sem gerar arquivos de migração.
**⚠️ Use apenas em desenvolvimento!**

### Abrir Drizzle Studio (UI visual)

```bash
npm run db:studio
```

Acesse `https://local.drizzle.studio` para visualizar e editar dados.

## 📊 Scripts Disponíveis

No `package.json`:

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

## 🔄 Workflow Recomendado

### Para novas features (produção)

1. Edite `src/db/schema.ts`
2. Gere a migração: `npm run db:generate`
3. Revise o SQL gerado em `/drizzle/`
4. Aplique: `npm run db:migrate`
5. Commit os arquivos de migração

### Para desenvolvimento rápido (local)

1. Edite `src/db/schema.ts`
2. Push direto: `npm run db:push`

## 🧪 Exemplo de Uso no Código

```typescript
import { db } from "@/db";
import { reservationsTable, reservationAuditsTable } from "@/db/schema";
import { eq } from "drizzle-orm";

// Criar uma reserva
const [reservation] = await db
  .insert(reservationsTable)
  .values({
    externalId: "RES-2024-001",
    enterprise: "Acme Corp",
    status: "pending",
  })
  .returning();

// Buscar com relações
const reservationWithAudits = await db.query.reservationsTable.findFirst({
  where: eq(reservationsTable.id, reservation.id),
  with: {
    audits: true,
  },
});

// Query tradicional
const audits = await db
  .select()
  .from(reservationAuditsTable)
  .where(eq(reservationAuditsTable.reservationId, reservation.id))
  .orderBy(reservationAuditsTable.createdAt);
```

## 📚 Documentação Oficial

- [Drizzle ORM Docs](https://orm.drizzle.team/docs/overview)
- [Drizzle Kit Migrations](https://orm.drizzle.team/docs/kit-overview)
- [Drizzle with Next.js](https://orm.drizzle.team/docs/tutorials/drizzle-nextjs-neon)

## 🔧 Troubleshooting

### Erro: "DATABASE_URL is not set"

Certifique-se de ter um arquivo `.env.local` com `DATABASE_URL` configurado.

### Migrations falhando

Verifique se o banco existe e se as credenciais estão corretas:

```bash
psql $DATABASE_URL -c "SELECT 1"
```

### Reset completo do banco (⚠️ CUIDADO)

```bash
# Drop e recria o banco
dropdb lyx_contract_intelligence
createdb lyx_contract_intelligence

# Aplica todas as migrations novamente
npm run db:migrate
```
