# Deploy UNICV Studio no Coolify

Guia passo a passo para deploy no Coolify. Docker: `infra/docker/Dockerfile` (targets `api` e `web`), compose: `infra/docker/docker-compose.yml`. Contexto de build: raiz do repositório.

## Resumo

1. **PostgreSQL:** criar DB no Coolify; anotar connection string.
2. **API:** aplicação Dockerfile, path `infra/docker/Dockerfile`, target `api`, porta 3001. Variáveis: DATABASE_URL, ADMIN_USER, ADMIN_PASSWORD, COOKIE_SECRET, BASE_URL, PUBLIC_BASE_URL. Storage: `/data/exports`.
3. **Web:** Dockerfile target `web`, porta 80. Variáveis build: VITE_API_BASE_URL, VITE_PUBLIC_BASE_URL (URLs https da API e do player).
4. **Domínios:** configurar SSL (Let's Encrypt) para API e Web.
5. **Health:** `https://api.seudominio.com/health` → `{"ok":true}`.

Variáveis obrigatórias em produção: ADMIN_USER, ADMIN_PASSWORD, COOKIE_SECRET, PUBLIC_BASE_URL. Nunca usar http em produção (Mixed Content). Ver [DEPLOY.md](DEPLOY.md) e [COOLIFY_CHECKLIST.md](COOLIFY_CHECKLIST.md) para detalhes.
