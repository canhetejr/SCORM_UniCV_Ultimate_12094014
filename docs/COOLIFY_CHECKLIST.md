# Checklist Deploy UniCV Studio no Coolify

## Studio — Next.js + Supabase ✅

- [ ] Projeto Supabase criado e credenciais anotadas
- [ ] Usuário admin criado em Supabase → Authentication → Users
- [ ] Migrations aplicadas (`prisma migrate deploy`)
- [ ] No Coolify: Build Pack = **Docker Compose**
- [ ] Base Directory = `/infra/docker`
- [ ] Docker Compose Location = `/docker-compose.studio.yml`
- [ ] Variáveis `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL` definidas
- [ ] `NEXT_PUBLIC_BASE_URL` e `PUBLIC_BASE_URL` apontando para `https://studio.SEU_DOMINIO`
- [ ] Domínio configurado com SSL
- [ ] Health: `https://studio.SEU_DOMINIO/api/health` → `{"status":"ok","db":"ok"}`
- [ ] Login funciona em `https://studio.SEU_DOMINIO/login`

---

## Legado — API + Web (Fastify + nginx)

- [ ] Build Pack = **Docker Compose**
- [ ] Base Directory = `/infra/docker`
- [ ] Docker Compose Location = `/docker-compose.coolify.yml` (**não** o `docker-compose.yml`)
- [ ] Variáveis: `ADMIN_USER`, `ADMIN_PASSWORD`, `COOKIE_SECRET`, `PUBLIC_BASE_URL`, `POSTGRES_PASSWORD`
- [ ] Health: `https://api.SEU_DOMINIO/health` → `{"status":"ok"}`

Documentação completa: [COOLIFY.md](COOLIFY.md) e [DEPLOY.md](DEPLOY.md)
