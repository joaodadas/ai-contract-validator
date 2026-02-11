# Quick Start — Lyx Contract Intelligence

## 🚀 Setup Rápido (5 minutos)

### 1. Clone e instale

```bash
git clone git@github.com:Tecnologia-Lyx/lyx-contract-intelligence.git
cd lyx-contract-intelligence
npm install
```

### 2. Configure o ambiente

```bash
cp .env.local.example .env.local
```

Edite `.env.local`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lyx_contract_intelligence
SESSION_SECRET=generate-a-secure-random-string-min-32-chars
```

### 3. Inicie o PostgreSQL

#### Opção A: Docker (recomendado)

```bash
docker run -d \
  --name lyx-postgres \
  -e POSTGRES_DB=lyx_contract_intelligence \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:16-alpine
```

#### Opção B: PostgreSQL Local

```bash
createdb lyx_contract_intelligence
```

### 4. Execute as migrações

```bash
npm run db:push
```

### 5. (Opcional) Popule dados iniciais

```bash
npx tsx src/db/seed.ts
```

### 6. Inicie o servidor

```bash
npm run dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

## 📊 Explorar o Banco de Dados

```bash
npm run db:studio
```

Acesse: [https://local.drizzle.studio](https://local.drizzle.studio)

## 📚 Próximos Passos

- [DATABASE_SETUP.md](./DATABASE_SETUP.md) — Documentação completa do banco
- [README.md](./README.md) — Documentação do projeto
- `/src/db/queries.example.ts` — Exemplos de queries Drizzle

## 🛠️ Scripts Úteis

```bash
npm run dev          # Desenvolvimento
npm run build        # Build de produção
npm run db:generate  # Gerar migrations
npm run db:push      # Aplicar mudanças no DB
npm run db:studio    # UI visual do banco
```

## 🔧 Troubleshooting

### Erro de conexão com o banco

Verifique se o PostgreSQL está rodando:

```bash
docker ps  # Se usando Docker
psql $DATABASE_URL -c "SELECT 1"  # Testar conexão
```

### Erro de autenticação

Certifique-se de ter criado um usuário no sistema:

```bash
# Acesse /register na aplicação e crie uma conta
```

### Reset completo

```bash
docker stop lyx-postgres && docker rm lyx-postgres
# Recrie o container e rode as migrations novamente
```
