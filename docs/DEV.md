# UniCV Studio — Guia de Desenvolvimento

## Apps disponíveis

| App | Stack | Porta | Descrição |
|-----|-------|-------|-----------|
| `apps/studio` | Next.js 15 + Supabase | 3000 | **App principal** — frontend + API unificados |
| `apps/api` | Fastify + Postgres | 3001 | API legada (mantida para referência) |
| `apps/web` | React + Vite | 5173 | Frontend legado (mantido para referência) |

---

## Setup — apps/studio (recomendado)

### 1. Pré-requisitos

- Node.js 20+
- Conta no [Supabase](https://supabase.com) (gratuita)

### 2. Criar projeto no Supabase

1. Crie um novo projeto em [supabase.com/dashboard](https://supabase.com/dashboard)
2. Em **Project Settings → API** copie:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Em **Project Settings → Database** copie as connection strings:
   - **Transaction pooler** → `DATABASE_URL` (porta 6543, usado pelo Prisma em produção)
   - **Session pooler** → `DIRECT_URL` (porta 5432, usado para migrations)
4. Em **Authentication → Users → Add user** crie o usuário admin (e-mail + senha)

### 3. Configurar .env

```bash
cp apps/studio/.env.example apps/studio/.env
# editar apps/studio/.env com as credenciais do Supabase
```

Variáveis mínimas para rodar:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
DATABASE_URL=postgresql://postgres.xxx:[SENHA]@aws-0-xx.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.xxx:[SENHA]@aws-0-xx.pooler.supabase.com:5432/postgres
```

### 4. Instalar e migrar

```bash
npm install
npm --workspace apps/studio run prisma:migrate
```

### 5. Rodar

```bash
npm run dev:studio        # só studio (porta 3000)
```

URLs:
- App: http://localhost:3000
- Login: http://localhost:3000/login
- Player: http://localhost:3000/player?vitrine_id=XXX
- Health: http://localhost:3000/api/health

---

## Setup — apps/api + apps/web (legado)

```bash
cp .env.example apps/api/.env   # editar DATABASE_URL, ADMIN_USER, ADMIN_PASSWORD, COOKIE_SECRET
npm install
npm run dev          # API (3001) + Web (5173) simultâneos
```

---

## Scripts raiz

| Script | Descrição |
|--------|-----------|
| `npm run dev:studio` | Studio (Next.js) — porta 3000 |
| `npm run dev:api` | API Fastify — porta 3001 |
| `npm run dev:web` | Web Vite — porta 5173 |
| `npm run dev` | API + Web legado simultâneos |
| `npm run build:studio` | Build studio |
| `npm run build` | Build API + Web legado |

## Scripts do studio (dentro de apps/studio)

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Next.js dev |
| `npm run build` | Next.js build |
| `npm run prisma:migrate` | Criar/aplicar migrations |
| `npm run prisma:studio` | UI visual do banco |

---

## Problemas comuns

| Problema | Solução |
|----------|---------|
| Login não funciona | Verifique `NEXT_PUBLIC_SUPABASE_URL` e `ANON_KEY`; confira usuário criado no Supabase |
| Prisma connection error | Use `DATABASE_URL` com `?pgbouncer=true` na porta 6543 (pooler) |
| Migration falha | Use `DIRECT_URL` na porta 5432 (sem pgbouncer) |
| Player sem vídeos | Vitrine precisa ter status `ACTIVE` e `vitrine_id` correto na URL |
| Export sem arquivo | Verifique se `EXPORTS_DIR` existe e tem permissão de escrita |
