# UniCV Studio

Player SCORM 1.2 (Moodle) + painel para vitrines Vimeo, export HTML/SCORM e LTI 1.3 / xAPI.

## Estrutura

- **apps/api** — API Fastify + Prisma + Postgres (porta 3001)
- **apps/web** — Painel React (Vite)
- **packages/player** — Player estático (HTML/JS/CSS)
- **infra/docker** — Dockerfile e docker-compose oficiais
- **tools** — Scripts (ex.: `build-packages.js` para SCORM em lote)
- **docs** — Documentação

## Como rodar

```bash
cp .env.example apps/api/.env   # editar DATABASE_URL, ADMIN_*
npm install
npm run dev                     # API + Web
```

API: http://localhost:3002 (ou PORT no .env). Web: http://localhost:5173.

## Deploy

Na raiz do repositório:

```bash
docker compose -f infra/docker/docker-compose.yml build
docker compose -f infra/docker/docker-compose.yml up -d
```

Variáveis: ver `docs/DEPLOY.md` e `.env.example`.

Documentação: `docs/` (Studio, DEPLOY, DEV, COOLIFY).
