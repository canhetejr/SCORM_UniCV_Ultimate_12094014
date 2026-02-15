# Deploy UniCV Studio (Docker)

Este projeto roda em Docker com:

- **API** (`studio/api`) — porta **3001**
- **Web** (`studio/web`) — porta **3000** (nginx na 80)
- **Postgres** — para dados, vitrines, tokens OAuth e jobs de export

## Docker Compose

Use o arquivo [`docker-compose.studio.yml`](../docker-compose.studio.yml).

```bash
docker compose -f docker-compose.studio.yml up -d
```

### Variáveis de ambiente

Configure no `.env` na raiz ou via variáveis de ambiente (Coolify: env vars da aplicação).

#### ENV REQUIRED (obrigatório em produção)

| Variável | Descrição |
|----------|-----------|
| `ADMIN_USER` | Login do painel admin |
| `ADMIN_PASSWORD` | Senha do painel admin |
| `COOKIE_SECRET` | Segredo para cookies (mín. 16 caracteres) |
| `PUBLIC_BASE_URL` | URL pública do player (links partilháveis; ex.: `https://ava.seudominio.com`) |
| `DATABASE_URL` | Connection string Postgres. No compose usa: `postgresql://postgres:SENHA@db:5432/unicv?schema=public` |

#### Outras (recomendadas)

- `POSTGRES_PASSWORD` — senha do Postgres (usada para montar `DATABASE_URL` no compose)
- `BASE_URL` — URL pública da API (ex.: `https://api.seudominio.com`)
- `VIMEO_CLIENT_ID`, `VIMEO_CLIENT_SECRET` — para OAuth Vimeo

## Volumes

- **Postgres**: `unicv_pg` — dados do banco
- **Exports**: `exports_data` — ZIPs gerados em `/data/exports`

## Migrações (Prisma)

O container da API executa na inicialização:

- `prisma migrate deploy`

Basta garantir que `DATABASE_URL` esteja correto e o banco acessível.

## Docker Hub

Para publicar imagens: configure `DOCKERHUB_USERNAME` e `DOCKERHUB_TOKEN` no GitHub Actions e crie uma tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

O workflow `.github/workflows/docker-publish.yml` publica `unicv-studio-api` e `unicv-studio-web`.
