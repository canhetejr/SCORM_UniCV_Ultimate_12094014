# Checklist Deploy UNICV Studio no Coolify (1 página)

- Tipo: **Docker Compose**
- Arquivo: `infra/docker/docker-compose.yml` (build context = raiz do repo)
- Variáveis obrigatórias: POSTGRES_PASSWORD, ADMIN_USER, ADMIN_PASSWORD, COOKIE_SECRET, BASE_URL, API_BASE_URL, PUBLIC_BASE_URL
- Health: `curl https://api.DOMINIO/health` → `{"ok":true}` ou `{"status":"ok"}`
- Documentação completa: [COOLIFY.md](COOLIFY.md) e [DEPLOY.md](DEPLOY.md)
