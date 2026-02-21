# FASE 4A — Módulo CONFIG — Relatório

## Arquivos criados

| Arquivo | Descrição |
|--------|-----------|
| `apps/api/src/modules/config/config.repository.ts` | Repositório: único uso de Prisma no módulo (appConfig) |
| `apps/api/src/modules/config/config.service.ts` | Serviço das rotas: getStatus, getEnvItems, updateEnv |

## Arquivos modificados

| Arquivo | Alteração |
|--------|-----------|
| `apps/api/src/modules/config/config.routes.ts` | Removidos `prisma`, `resolveBaseUrlForStatus`, `resolvePublicBaseUrlForStatus`, `buildConfigItems`, `EDITABLE_KEYS`. Rotas apenas extraem dados de `deps`/body, chamam o service e fazem `reply.send()`. |
| `apps/api/src/modules/config/appConfig.service.ts` | `loadDbConfig(prisma)` passou a usar `findAllAppConfig(prisma)` do repository em vez de `prisma.appConfig.findMany()` direto. |

---

## Funções do repository

| Função | Descrição |
|--------|-----------|
| `findAllAppConfig(client?)` | `prisma.appConfig.findMany()` (ou `client` quando passado, para manter `loadDbConfig(prisma)` em server). Retorna todas as linhas. |
| `deleteAppConfigByKey(key)` | `prisma.appConfig.deleteMany({ where: { key } })`. |
| `upsertAppConfig(key, value)` | `prisma.appConfig.upsert` create/update por key. |

## Funções do service (config.service.ts)

| Função | Descrição |
|--------|-----------|
| `getStatus(params)` | Monta `{ vimeo, lti, lrs, urls }` a partir de getConfig, env, vimeoClientId, vimeoClientSecret; usa `resolvePublicBaseUrlForStatus` e `resolveBaseUrlForStatus`. Não usa Fastify nem Prisma. |
| `getEnvItems(getConfig)` | Retorna `{ items: buildConfigItems(getConfig) }`. |
| `updateEnv(updates, dbConfigMap, getConfig)` | Para cada key em EDITABLE_KEYS: se valor null/'' chama repository.delete e remove do map; senão repository.upsert e set no map. Retorna `{ items: buildConfigItems(getConfig) }`. |

---

## Confirmações

| Regra | Status |
|-------|--------|
| Rota não usa Prisma | ✅ `config.routes.ts` não importa nem usa `prisma` |
| Rota não contém regra de negócio | ✅ Apenas extração de params/deps, chamada ao service e `reply.send()` |
| Service não usa Fastify | ✅ Nenhum import de fastify, request ou reply em `config.service.ts` |
| Repository é único que usa Prisma | ✅ Apenas `config.repository.ts` chama `prisma.appConfig.*` (e `findAllAppConfig` pode receber client para compatibilidade com `loadDbConfig(prisma)`) |
| Sem try/catch manual nas rotas | ✅ Erros sobem para o Fastify Global Error Handler |
| Prefixos / JSON / status / assinaturas | ✅ GET `/status`, GET `/env`, PUT `/env` inalterados; JSON e códigos mantidos |
| Nenhuma alteração fora do módulo config | ✅ Nenhum arquivo em `server.ts` ou outros módulos foi alterado |

---

## Build TypeScript

- **Lint:** sem erros em `apps/api/src/modules/config`.
- **Build:** executar localmente em `apps/api`: `npm run build` ou `npx tsc --noEmit` para confirmar.

---

## Fluxo

- **GET /v1/config/status**  
  Routes → `configService.getStatus({ getConfig, env, vimeoClientId, vimeoClientSecret })` → `reply.send(result)`.

- **GET /v1/config/env**  
  Routes → `configService.getEnvItems(getConfig)` → `reply.send(result)`.

- **PUT /v1/config/env**  
  Routes → `configService.updateEnv(updates, deps.dbConfigMap, getConfig)` → service chama `config.repository` (delete/upsert), atualiza `dbConfigMap`, retorna `{ items }` → `reply.send(result)`.

`loadDbConfig(prisma)` em `appConfig.service` continua com a mesma assinatura e agora delega a leitura ao repository (`findAllAppConfig(prisma)`), mantendo o uso em `server.ts` sem alterações.
