# UNICV Studio — Guia de Desenvolvimento

## Como rodar

1. **Instalar:** `npm install`
2. **Configurar:** `cp .env.example apps/api/.env` e editar (DATABASE_URL, ADMIN_USER, ADMIN_PASSWORD, COOKIE_SECRET).
3. **Subir:** `npm run dev` (API + Web) ou `npm run dev:api` / `npm run dev:web`.

URLs: API http://localhost:3002 (ou PORT no .env), Web http://localhost:5173, Player http://localhost:3002/player/index.html.

## Scripts

| Script | Descrição |
|--------|-----------|
| `npm run dev` | API + Web em watch |
| `npm run dev:api` | Só API |
| `npm run dev:web` | Só Web |
| `npm run build` | Build API + Web |
| `npm run doctor` | Diagnóstico (portas, .env) |
| `npm run smoke` | Testes rápidos da API |

## Problemas comuns

- **EADDRINUSE:** liberar porta ou alterar PORT em `apps/api` / porta no `apps/web/vite.config.ts`.
- **503 no login:** definir ADMIN_USER e ADMIN_PASSWORD em `apps/api/.env`.
- **Prisma:** `npm --workspace apps/api run prisma:generate` (ou `postinstall` já faz).
- **Doctor:** `npm run doctor` para verificar ambiente.
