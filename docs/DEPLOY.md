# Deploy UniCV Studio (Docker)

Dois modos de deploy disponíveis:

| Modo | Compose | Stack | Banco |
|------|---------|-------|-------|
| **Studio (recomendado)** | `docker-compose.studio.yml` | Next.js standalone | Supabase (externo) |
| Legado | `docker-compose.coolify.yml` | Fastify API + nginx | Postgres (container) |

---

## Studio — Next.js + Supabase

### Pré-requisito

Projeto criado no Supabase com connection strings disponíveis (ver [DEV.md](DEV.md) para criar o projeto).

### Build e subida

Na **raiz do repositório**:

```bash
docker compose -f infra/docker/docker-compose.studio.yml build
docker compose -f infra/docker/docker-compose.studio.yml up -d
```

### Variáveis de ambiente

#### Obrigatórias

| Variável | Descrição |
|----------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anon pública do Supabase |
| `DATABASE_URL` | Connection string Supabase (pooler porta 6543) |
| `NEXT_PUBLIC_BASE_URL` | URL pública do app (ex: `https://studio.unicive.cloud`) |
| `PUBLIC_BASE_URL` | Igual ao anterior (server-side) |

#### Opcionais

| Variável | Descrição |
|----------|-----------|
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service role (para operações admin) |
| `DIRECT_URL` | Connection string direta (porta 5432, para migrations) |
| `VIMEO_CLIENT_ID` | OAuth Vimeo |
| `VIMEO_CLIENT_SECRET` | OAuth Vimeo |
| `VIMEO_REDIRECT_URI` | Callback OAuth: `https://SEU_DOMINIO/api/auth/vimeo/callback` |
| `LTI_PLATFORM_ISSUER` | Issuer da plataforma LTI |
| `LTI_PLATFORM_CLIENT_ID` | Client ID LTI |
| `LTI_PLATFORM_AUTH_LOGIN_URL` | URL de auth LTI |
| `LTI_PLATFORM_KEYSET_URL` | JWKS URL da plataforma |
| `LTI_PLATFORM_DEPLOYMENT_ID` | Deployment ID LTI |
| `LTI_TOOL_PRIVATE_KEY_PEM` | Chave RSA privada da ferramenta LTI |
| `LTI_TOOL_KID` | Key ID (padrão: `unicv-tool-1`) |
| `LRS_ENDPOINT` | Endpoint xAPI/LRS |
| `LRS_BASIC_AUTH` | Auth básico LRS (base64) |
| `EXPORTS_DIR` | Diretório para ZIPs gerados (padrão: `/tmp/exports`) |

### Volumes

- `exports_data` → `/tmp/exports` (ZIPs SCORM e HTML)

### Health check

```bash
curl https://SEU_DOMINIO/api/health
# {"status":"ok","db":"ok"}
```

---

## Legado — Fastify API + nginx + Postgres

### Compose

```bash
# Local (com ports expostos):
docker compose -f infra/docker/docker-compose.yml build
docker compose -f infra/docker/docker-compose.yml up -d

# Coolify (sem ports, proxy gerencia):
# usar docker-compose.coolify.yml no Coolify UI
```

### Variáveis obrigatórias (legado)

| Variável | Descrição |
|----------|-----------|
| `ADMIN_USER` | Login admin |
| `ADMIN_PASSWORD` | Senha admin |
| `COOKIE_SECRET` | Segredo cookies (mín. 16 chars) |
| `PUBLIC_BASE_URL` | URL pública da API/player |
| `DATABASE_URL` | `postgresql://postgres:SENHA@db:5432/unicv?schema=public` |

### Volumes (legado)

- `unicv_pg` → dados Postgres
- `exports_data` → `/data/exports`

---

## Migrations

### Studio

As migrations devem ser aplicadas **antes** do deploy ou durante CI. O Dockerfile não executa migrations automaticamente — use:

```bash
DATABASE_URL=... npx prisma migrate deploy --schema apps/studio/prisma/schema.prisma
```

Ou via Supabase dashboard (SQL editor com as migrations de `apps/studio/prisma/migrations/`).

### Legado

O container da API executa `prisma migrate deploy` na inicialização via entrypoint.
