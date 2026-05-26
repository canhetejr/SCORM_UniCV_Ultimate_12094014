# Documentação — UniCV Studio

## Guias principais

| Documento | Conteúdo |
|-----------|----------|
| [DEV.md](DEV.md) | Setup local, scripts, problemas comuns |
| [DEPLOY.md](DEPLOY.md) | Docker, variáveis, volumes (Studio + Legado) |
| [COOLIFY.md](COOLIFY.md) | Deploy no Coolify (Studio + Legado) |
| [COOLIFY_CHECKLIST.md](COOLIFY_CHECKLIST.md) | Checklist 1 página |

## Apps

| App | Stack | Docs |
|-----|-------|------|
| `apps/studio` | Next.js 15 + Supabase Auth + Prisma | [DEV.md](DEV.md) · [DEPLOY.md](DEPLOY.md) |
| `apps/api` *(legado)* | Fastify 5 + Postgres + JWT | — |
| `apps/web` *(legado)* | React 19 + Vite | — |

## Variáveis de ambiente

- Studio: `apps/studio/.env.example`
- Legado: `.env.example` na raiz

## Referências internas

| Documento | Conteúdo |
|-----------|----------|
| [Studio.md](Studio.md) | Visão geral da aplicação |
| [DOCUMENTACAO_PARA_HUMANOS.md](DOCUMENTACAO_PARA_HUMANOS.md) | Player, arquitetura, fluxos |
| [env.coolify.example](env.coolify.example) | Exemplo vars Coolify (legado) |
