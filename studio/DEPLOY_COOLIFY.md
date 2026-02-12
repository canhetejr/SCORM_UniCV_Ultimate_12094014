# Deploy no Coolify (VPS)

Este projeto foi preparado para rodar em Docker com:

- **API** (`studio/api`) — porta **3001**
- **Web** (`studio/web`) — porta **80** (exposta como 3000 no compose local)
- **Postgres** — para dados, vitrines, tokens OAuth e jobs de export

## Opção A — Docker Compose (recomendado para começar)

Use o arquivo [`docker-compose.studio.yml`](../docker-compose.studio.yml).

No Coolify:

- Crie um recurso do tipo **Docker Compose**
- Aponte para o repositório e selecione `docker-compose.studio.yml`
- Configure as variáveis de ambiente (no mínimo as do Vimeo e o `COOKIE_SECRET`)

### Variáveis mínimas

- **API**
  - `DATABASE_URL` (já aponta para `db` no compose)
  - `BASE_URL` (URL pública da API na VPS, ex.: `https://api.seu-dominio.com`)
  - `COOKIE_SECRET` (>= 16 chars)
  - `EXPORT_DIR` (ex.: `var/exports`, e mapear volume)

- **Vimeo OAuth**
  - `VIMEO_CLIENT_ID`
  - `VIMEO_CLIENT_SECRET`
  - `VIMEO_REDIRECT_URI` (opcional; se vazio usa `BASE_URL + /auth/vimeo/callback`)

## Opção B — Apps separadas no Coolify

Se preferir separar:

- App 1: **API** (build `studio/api/Dockerfile`) → expor 3001
- App 2: **WEB** (build `studio/web/Dockerfile`) → expor 80
- Banco: recurso Postgres do próprio Coolify

## Volumes (exportações)

Mapeie o volume para persistir os ZIPs gerados:

- Container `api`: `/app/studio/api/var/exports`

## Backup (recomendado)

- **Postgres**: backup diário via `pg_dump` (Coolify geralmente tem opção de backup/snapshot dependendo do provedor).
- **Exports**: snapshot do volume `unicv_exports` (ou mover artifacts para S3/MinIO futuramente).

## Migrações (Prisma)

O container da API executa na inicialização:

- `prisma migrate deploy`

Então basta garantir que `DATABASE_URL` esteja correto e o banco acessível.

## Docker Hub

Para publicar as imagens no Docker Hub (e opcionalmente usar no Coolify em vez de build local):

1. No GitHub: **Settings → Secrets and variables → Actions** — crie:
   - `DOCKERHUB_USERNAME`: seu usuário Docker Hub
   - `DOCKERHUB_TOKEN`: token de acesso (Docker Hub → Account Settings → Security → New Access Token)

2. Crie e envie uma tag para disparar o workflow:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

3. O workflow [.github/workflows/docker-publish.yml](../.github/workflows/docker-publish.yml) fará build e push de:
   - `SEU_USER/unicv-studio-api:VERSION` e `:latest`
   - `SEU_USER/unicv-studio-web:VERSION` e `:latest`

4. No Coolify, em vez de build a partir do repositório, você pode usar **Imagem Docker** e informar `SEU_USER/unicv-studio-api:latest` (e o mesmo para web), desde que o serviço `db` e as variáveis de ambiente estejam configurados.

## Checklist rápido pós-deploy

- Abrir o painel web e clicar em **Conectar conta** (Vimeo OAuth)
- Listar Showcases e **Importar**
- Abrir **preview** da vitrine
- Exportar **SCORM** e instalar no Moodle (teste)

