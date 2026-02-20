# UniCV Studio (VPS)

Aplicação para **gerenciar vitrines/vídeos**, **integrar com Vimeo (OAuth)** e **exportar** (HTML/SCORM/iframe) + **LTI/xAPI**. Para o Player (HTML/JS em `packages/player`), veja [DOCUMENTACAO_PARA_HUMANOS.md](DOCUMENTACAO_PARA_HUMANOS.md). Para deploy, veja [DEPLOY.md](DEPLOY.md).

## Stack

- **API**: Fastify + TypeScript + Prisma + Postgres (`apps/api`)
- **Painel**: React em `apps/web` (Vite)

## Rodar localmente

1. Crie `apps/api/.env` (base em `.env.example` na raiz).
2. Postgres configurado com `DATABASE_URL`.
3. `npm install` e depois:

```bash
npm run dev:api   # API
npm run dev:web   # Painel
```

Ou `npm run dev` para os dois.

## Endpoints (resumo)

- `GET /health`
- `GET /v1/playlist?showcase_id=...`
- `GET /auth/vimeo/start` + callback (OAuth)
- `GET /lti/login` + `POST /lti/launch` (LTI 1.3)
- Ver [DEV.md](DEV.md) e código em `apps/api/src/routes/`.
