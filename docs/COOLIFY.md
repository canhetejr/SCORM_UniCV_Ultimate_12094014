# Deploy UniCV Studio no Coolify

Dois modos possíveis. Use **Studio** para novos deploys.

---

## Studio — Next.js + Supabase (recomendado)

### Configuração no Coolify UI

| Campo | Valor |
|-------|-------|
| Build Pack | Docker Compose |
| Base Directory | `/infra/docker` |
| Docker Compose Location | `/docker-compose.studio.yml` |
| Domínio | `https://studio.seudominio.com` |

### Variáveis de ambiente no Coolify

Cole cada variável no painel **Environment Variables**:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://postgres.xxx:[SENHA]@aws-0-xx.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.xxx:[SENHA]@aws-0-xx.pooler.supabase.com:5432/postgres
NEXT_PUBLIC_BASE_URL=https://studio.seudominio.com
PUBLIC_BASE_URL=https://studio.seudominio.com
VIMEO_CLIENT_ID=
VIMEO_CLIENT_SECRET=
VIMEO_REDIRECT_URI=https://studio.seudominio.com/api/auth/vimeo/callback
```

### Antes do primeiro deploy

1. Crie o usuário admin no Supabase: **Authentication → Users → Invite user**
2. Aplique as migrations via Supabase SQL Editor ou `prisma migrate deploy`
3. Trigger o deploy no Coolify

### Health check

```
https://studio.seudominio.com/api/health → {"status":"ok","db":"ok"}
```

---

## Legado — API + Web (Fastify + nginx)

### Configuração no Coolify UI

| Campo | Valor |
|-------|-------|
| Build Pack | Docker Compose |
| Base Directory | `/infra/docker` |
| Docker Compose Location | `/docker-compose.coolify.yml` |
| Domínios | `https://api.seudominio.com` (API) e `https://studio.seudominio.com` (Web) |

> **Importante:** use `docker-compose.coolify.yml` (sem `ports:`). O `docker-compose.yml` tem `ports:` e causa conflito com o proxy do Coolify.

### Variáveis obrigatórias (legado)

```env
ADMIN_USER=admin
ADMIN_PASSWORD=troque-aqui
COOKIE_SECRET=string-com-32-caracteres-aleatorios
PUBLIC_BASE_URL=https://api.seudominio.com
POSTGRES_PASSWORD=troque-aqui
BASE_URL=https://api.seudominio.com
API_BASE_URL=https://api.seudominio.com
VIMEO_REDIRECT_URI=https://api.seudominio.com/auth/vimeo/callback
```

### Health check (legado)

```
https://api.seudominio.com/health → {"status":"ok"}
```

---

## Dicas gerais Coolify

- Nunca use `http://` em produção (Mixed Content bloqueia requisições do player)
- Após mudar variáveis de ambiente, sempre re-trigger o deploy
- Verifique os logs do container em **Logs** se o health check falhar
- Para o studio: as `NEXT_PUBLIC_*` são injetadas no build — precisa rebuild após mudar
