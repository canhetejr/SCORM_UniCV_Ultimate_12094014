# Deploy UniCV Studio (Docker)

- **API** (`apps/api`) — porta **3001**
- **Web** (`apps/web`) — porta **3000** (nginx)
- **Postgres** — dados, vitrines, OAuth, exports

## Docker Compose

Use o compose em `infra/docker/`. Na **raiz do repositório**:

```bash
docker compose -f infra/docker/docker-compose.yml build
docker compose -f infra/docker/docker-compose.yml up -d
```

### Variáveis de ambiente

Configure na raiz (`.env`) ou no Coolify (env vars).

#### Obrigatório em produção

| Variável | Descrição |
|----------|-----------|
| `ADMIN_USER` | Login do painel admin |
| `ADMIN_PASSWORD` | Senha do painel admin |
| `COOKIE_SECRET` | Segredo para cookies (mín. 16 caracteres) |
| `PUBLIC_BASE_URL` | URL pública do player |
| `DATABASE_URL` | Connection string Postgres (`postgresql://postgres:SENHA@db:5432/unicv?schema=public` no compose) |

#### Outras

- `POSTGRES_PASSWORD` — senha do Postgres
- `BASE_URL` — URL pública da API
- `VIMEO_CLIENT_ID`, `VIMEO_CLIENT_SECRET` — OAuth Vimeo

## Volumes

- **Postgres**: `unicv_pg`
- **Exports**: `exports_data` → `/data/exports`

## Migrações

O container da API executa `prisma migrate deploy` na inicialização.

## Docker Hub

Workflow `.github/workflows/docker-publish.yml`: configure `DOCKERHUB_USERNAME` e `DOCKERHUB_TOKEN`; tag `v*` publica imagens `unicv-studio-api` e `unicv-studio-web`.
