# Relatório — FASE 3F: Error Layer Global

## 1. Arquivos criados

| Arquivo | Conteúdo |
|---------|----------|
| `apps/api/src/shared/errors/AppError.ts` | Classe `AppError` (extends Error, `statusCode`, `code`); subclasses `NotFoundError` (404, NOT_FOUND) e `BadRequestError` (400, BAD_REQUEST). |

---

## 2. Arquivos modificados

| Arquivo | Alterações |
|---------|------------|
| `apps/api/src/server.ts` | Import de `AppError`; chamada a `app.setErrorHandler(...)` antes do `return app`. O handler: se `error instanceof AppError`, responde com `error.statusCode` e `{ error: error.code, message: error.message }`; caso contrário, loga o erro e responde 500 com `INTERNAL_ERROR`. |
| `apps/api/src/modules/vitrines/vitrines.service.ts` | Removidos tipo `VitrineServiceError` e todos os `throw { code, message }`. Import de `NotFoundError` e `BadRequestError` de `../../shared/errors/AppError.js`. Substituição por `throw new NotFoundError("...")` e `throw new BadRequestError("...")`. Validação de `title` vazio em `createVitrineForAccount` e de `direction` em `moveVideoInVitrine` passando a lançar `BadRequestError`. |
| `apps/api/src/modules/vitrines/vitrines.routes.ts` | Removidos `VitrineServiceError`, `isVitrineServiceError`, todos os `try/catch`, `reply.notFound(...)` e `reply.badRequest(...)`. Rotas passam a apenas extrair dados do request, chamar o service e `reply.send(result)`. |

---

## 3. Confirmação: rotas não tratam erro manualmente

- **Nenhuma** ocorrência de `try`, `catch`, `reply.notFound`, `reply.badRequest` ou `isVitrineServiceError` em `vitrines.routes.ts`.
- Cada handler: extrai params/body → chama uma função do service → `return reply.send(...)`.
- Erros (incluindo `NotFoundError` e `BadRequestError`) propagam e são tratados pelo `setErrorHandler` global.

---

## 4. Confirmação: service usa AppError

- O service importa `BadRequestError` e `NotFoundError` de `../../shared/errors/AppError.js`.
- Usa apenas `throw new NotFoundError("...")` e `throw new BadRequestError("...")`; não há tipo ou objeto de erro customizado.
- O service **não** importa Fastify.

---

## 5. Confirmação: server.ts tem setErrorHandler

- Em `server.ts` existe `app.setErrorHandler((error, request, reply) => { ... })`.
- Se `error instanceof AppError`: `reply.status(error.statusCode).send({ error: error.code, message: error.message })`.
- Caso contrário: `request.log.error(error)` e `reply.status(500).send({ error: "INTERNAL_ERROR", message: "Internal server error" })`.

---

## 6. Compilação TypeScript

- **Linter:** sem erros nos arquivos alterados/criados.
- Recomenda-se rodar localmente: `cd apps/api && npm run build`.

---

## 7. Escopo

- Nenhuma mudança fora do módulo vitrines além de: criação de `shared/errors/AppError.ts` e alteração de `server.ts` (error handler global).
- Repository não foi alterado e não lança AppError (apenas retorna null quando aplicável).

---

**Resumo:** Camada de erro global com `AppError` e handler centralizado no Fastify; service de vitrines passou a lançar `NotFoundError`/`BadRequestError`; rotas de vitrines só extraem dados, chamam o service e enviam a resposta.
