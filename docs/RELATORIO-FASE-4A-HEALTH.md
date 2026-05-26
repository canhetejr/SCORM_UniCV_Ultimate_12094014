# FASE 4A — Módulo HEALTH — Relatório

## Arquivos criados

| Arquivo | Descrição |
|--------|-----------|
| `apps/api/src/modules/health/health.repository.ts` | Repositório: único uso de Prisma no módulo |
| `apps/api/src/modules/health/health.service.ts` | Serviço: orquestração e AppError |

## Arquivos modificados

| Arquivo | Alteração |
|--------|-----------|
| `apps/api/src/modules/health/health.routes.ts` | Removido `prisma`; passou a chamar apenas `healthService.getHealth()` e `reply.send(result)` |

---

## Funções criadas no repository

| Função | Descrição |
|--------|-----------|
| `checkDatabase()` | Executa `prisma.$queryRaw\`SELECT 1\``; retorna `true` se OK, `false` em falha. Não lança erro. |

## Funções criadas no service

| Função | Descrição |
|--------|-----------|
| `getHealth()` | Chama `checkDatabase()`; retorna `{ ok: true }` se DB OK; lança `AppError` (503, SERVICE_UNAVAILABLE) se DB indisponível. |

---

## Confirmações

| Regra | Status |
|-------|--------|
| Rota não usa Prisma | ✅ `health.routes.ts` não importa nem usa `prisma` |
| Rota não tem regra de negócio | ✅ Apenas extrai (nada), chama `healthService.getHealth()` e `reply.send(result)` |
| Service não usa Fastify | ✅ Nenhum import de `fastify`, `request` ou `reply` |
| Repository é único que usa Prisma | ✅ Apenas `health.repository.ts` importa e usa `prisma` |
| Sem try/catch manual nas rotas | ✅ Erros tratados pelo Fastify Global Error Handler |
| Prefixo e JSON mantidos | ✅ GET `/health` continua retornando `{ ok: true }` |

---

## Build TypeScript

- **Lint:** sem erros em `apps/api/src/modules/health`.
- **Build:** executar localmente `npm run build` em `apps/api` para confirmar (ambiente atual sem `npm` no PATH).

---

## Fluxo final

```
GET /health
  → health.routes.ts: chama healthService.getHealth()
  → health.service.ts: checkDatabase() → se false lança AppError(503)
  → health.repository.ts: prisma.$queryRaw`SELECT 1` (retorna true/false)
  → reply.send({ ok: true })
```

Erros (incluindo `AppError` por DB indisponível) são tratados pelo **Fastify Global Error Handler** em `server.ts`.
