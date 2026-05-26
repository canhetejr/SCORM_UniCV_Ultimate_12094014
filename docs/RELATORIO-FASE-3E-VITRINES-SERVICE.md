# Relatório — FASE 3E: Service Layer para Vitrines

## 1. Funções criadas no service

Arquivo: `apps/api/src/modules/vitrines/vitrines.service.ts`

| Função | Descrição |
|--------|-----------|
| `getVitrinesList()` | Retorna lista de vitrines com `videoCount` (normalização de `_count.videos`). |
| `createVitrineForAccount(accountId, params)` | Garante slug único (`ensureUniqueSlug` + `toKebab`), monta status e descrição, chama repository para criar. |
| `getVitrineById(id)` | Busca vitrine com account e vídeos; lança `NOT_FOUND` se não existir. |
| `updateVitrineById(id, params)` | Busca vitrine; monta dados de update (title, slug, status); se vazios retorna a atual, senão atualiza e retorna. Lança `NOT_FOUND` se não existir. |
| `duplicateVitrine(accountId, sourceId)` | Busca vitrine fonte, gera título/slug (cópia), cria nova vitrine, duplica vídeos, retorna a nova vitrine. Lança `NOT_FOUND` se fonte não existir. |
| `addVideoToVitrine(accountId, vitrineId, params, vimeoConn)` | Valida vitrine e dados (vimeo id, title); opcionalmente enriquece com Vimeo API; upsert vídeo e adiciona à vitrine. Lança `NOT_FOUND` ou `BAD_REQUEST`. |
| `removeVideoFromVitrine(vitrineId, videoId)` | Localiza vínculo, remove. Lança `NOT_FOUND` se vídeo não estiver na playlist. |
| `moveVideoInVitrine(vitrineId, videoId, direction)` | Delega ao repository; se não mover, lança `NOT_FOUND` ou `BAD_REQUEST`. |
| `importCsvIntoVitrine(accountId, vitrineId, csvText)` | Valida vitrine e CSV (colunas obrigatórias), parseia linhas (`parseCSVLine`, `resolveVimeoVideoId`), chama repository para importar. Retorna `{ imported }`. Lança `NOT_FOUND` ou `BAD_REQUEST`. |

**Tipo exportado:** `VitrineServiceError` (`code: 'NOT_FOUND' | 'BAD_REQUEST'`, `message: string`) para as rotas mapearem em respostas HTTP.

**Helpers internos (não exportados):** `toKebab`, `ensureUniqueSlug`, `parseCSVLine`, `resolveVimeoVideoId`, `parseStatus`, `parseStatusOptional`.

---

## 2. O que foi movido da rota para o service

| Antes (na rota) | Depois (no service) |
|-----------------|---------------------|
| `ensureUniqueSlug` | Implementado e usado em `createVitrineForAccount` e `duplicateVitrine`. |
| `toKebab` | Helper interno do service. |
| Lógica de criação de vitrine (slug, status, description, `createVitrine`) | `createVitrineForAccount`. |
| Lógica de update (find, montar data, decidir retornar atual ou atualizado) | `updateVitrineById`. |
| Lógica de duplicação (find source, título/slug, create, duplicate videos, find nova) | `duplicateVitrine`. |
| Lógica de import CSV (validação de CSV, parse, colunas, linhas, `resolveVimeoVideoId`, `importVideosFromCsv`) | `importCsvIntoVitrine` (inclui `parseCSVLine`, `resolveVimeoVideoId`). |
| Lógica de move (chamar repo, decidir 404 vs 400) | `moveVideoInVitrine`. |
| Normalização da lista (map com `videoCount`) | `getVitrinesList`. |
| Resolução de Vimeo + enriquecimento + upsert + add na vitrine (POST vídeo) | `addVideoToVitrine`. |
| Find + delete do vínculo (DELETE vídeo) | `removeVideoFromVitrine`. |
| Decisão de erro (NOT_FOUND vs BAD_REQUEST) para move e demais casos | Service lança `VitrineServiceError`; rota só traduz em `reply.notFound` / `reply.badRequest`. |

---

## 3. Confirmação: vitrines.routes.ts só faz HTTP

- **Rotas:** apenas extraem params/body do request, fazem validação mínima (ex.: `title` obrigatório no POST vitrine, `direction` up/down no move), chamam **uma** função do service e retornam o resultado.
- **Tratamento de erro:** uso de `isVitrineServiceError(e)` e mapeamento de `e.code` para `reply.notFound(e.message)` ou `reply.badRequest(e.message)`; demais erros são re-lançados.
- **Sem lógica de negócio:** nenhuma regra de slug, status, duplicação, import CSV, move ou enriquecimento Vimeo nas rotas; tudo no service.

---

## 4. Confirmação: service não usa Prisma nem Fastify

- **Prisma:** o service **não** importa `prisma` nem `../../infra/prisma/client`. Usa apenas o enum `VitrineStatus` de `@prisma/client` (tipo). Todo acesso a dados é via `vitrines.repository.js`.
- **Fastify:** o service **não** importa `fastify`; não usa `reply`, `request` nem nenhum tipo do Fastify. Apenas retorna dados ou lança `VitrineServiceError`.

---

## 5. Arquivos modificados

| Arquivo | Alteração |
|---------|-----------|
| `apps/api/src/modules/vitrines/vitrines.service.ts` | **Novo.** Contém toda a lógica de negócio listada acima e tipos exportados. |
| `apps/api/src/modules/vitrines/vitrines.routes.ts` | Reduzido a: extração de dados, validação mínima, chamada ao service, tratamento de `VitrineServiceError` e retorno da resposta. Removidos: `parseCSVLine`, `resolveVimeoVideoId`, `toKebab`, `ensureUniqueSlug`, imports do repository e do vimeo.service; adicionado import do service e helper `isVitrineServiceError`. |

---

## 6. Compilação TypeScript

- **Linter:** sem erros em `vitrines.service.ts` e `vitrines.routes.ts`.
- **Build:** não foi possível executar `npm run build` neste ambiente. Recomenda-se rodar localmente: `cd apps/api && npm run build`.

---

## 7. Regras e escopo

- Prefixos de rotas, JSON retornado, status codes e assinaturas dos handlers **inalterados**.
- Estrutura de pastas e outros módulos **não** foram modificados.
- Nenhuma outra alteração estrutural além da introdução do service e do afinamento das rotas.

---

**Resumo:** A lógica de negócio do módulo Vitrines foi concentrada em `vitrines.service.ts`; as rotas limitam-se a HTTP (request, validação mínima, service, reply). O service não usa Prisma nem Fastify e depende apenas do repository e do vimeo.service.
