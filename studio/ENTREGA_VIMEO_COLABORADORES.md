# Entrega: Colaboradores Vimeo + cache completo (vitrines + vídeos)

## Arquivos alterados / criados

### Banco (Prisma)
- `studio/api/prisma/schema.prisma` — models `VimeoCollaborator`, `VimeoCollaboratorShowcase`; **novos**: `VimeoCollaboratorVideo`, `VimeoCollaboratorShowcaseVideo`
- `studio/api/prisma/migrations/20260218000000_add_vimeo_collaborators/migration.sql` — migração original
- `studio/api/prisma/migrations/20260218120000_add_vimeo_collaborator_videos/migration.sql` — **novo**: tabelas de vídeos e join showcase↔video

### Backend (API)
- `studio/api/src/routes/adminVimeoCollaborators.ts` — rotas admin; **sync completo** (vitrines + vídeos com paginação, 429 retry, máx. 2 vitrines em paralelo); **novo endpoint** `GET /:id/showcases/:showcaseId/videos` (cache); GET colaboradores passa a incluir `videoCount`
- `studio/api/src/server.ts` — (sem alteração nesta entrega; rotas já registradas)
- `studio/api/src/services/vimeo.ts` — (sem alteração; já tinha timeout e 429)

### Frontend (Web)
- `studio/web/src/api/vimeoCollaborators.ts` — tipo `videoCount`; tipo e retorno de `syncCollaborator` (showcasesFetched, videosFetched, etc.); **novo** `getShowcaseVideos` e tipo `VimeoCollaboratorVideoItem`
- `studio/web/src/pages/home/HomePage.tsx` — status “Última atualização / total vitrines / total vídeos”; colaborador persistido em `localStorage`; busca vitrines com debounce 300ms; botão “Vídeos” no card → modal com lista de vídeos (busca debounce, paginação, thumb + nome + duração + copiar link)

---

## Comandos de teste

### 1. Migração e Prisma
```bash
cd studio/api
npm run prisma:generate
npx prisma migrate deploy   # ou migrate dev em dev
```

### 2. Build
```bash
cd studio/api && npm run build
cd studio/web && npm run build
```

### 3. Curl (com token admin)
Substitua `TOKEN` pelo token de `POST /v1/admin/login` e `COLLAB_ID` pelo id do colaborador.

```bash
# A) Criar colaborador (upsert por vimeoUserId)
curl -s -X POST "http://localhost:3002/admin/vimeo-collaborators" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"vimeoUserId":"82076795","label":"Meu Colab"}' | jq

# B) Listar colaboradores (inclui showcaseCount e videoCount)
curl -s "http://localhost:3002/admin/vimeo-collaborators" \
  -H "Authorization: Bearer TOKEN" | jq

# C) Sync TUDO (vitrines + vídeos; só esta rota chama Vimeo)
curl -s -X POST "http://localhost:3002/admin/vimeo-collaborators/COLLAB_ID/sync" \
  -H "Authorization: Bearer TOKEN" | jq
# Resposta: { ok: true, data: { showcasesFetched, showcasesUpserted, videosFetched, videosUpserted, linksUpserted, linksRemovedMarked } }

# D) Listar vitrines do cache (paginado + busca; NÃO chama Vimeo)
curl -s "http://localhost:3002/admin/vimeo-collaborators/COLLAB_ID/showcases?page=1&perPage=12&q=" \
  -H "Authorization: Bearer TOKEN" | jq

# E) Listar vídeos de uma vitrine (showcaseId = id interno da vitrine, retornado em D como item.id)
curl -s "http://localhost:3002/admin/vimeo-collaborators/COLLAB_ID/showcases/SHOWCASE_ID/videos?page=1&perPage=24&q=" \
  -H "Authorization: Bearer TOKEN" | jq

# F) Link showcase → vitrine do Studio
curl -s -X POST "http://localhost:3002/admin/vimeo-collaborators/COLLAB_ID/showcases/VIMEO_SHOWCASE_ID/link" \
  -H "Authorization: Bearer TOKEN" | jq

# G) Remover colaborador
curl -s -X DELETE "http://localhost:3002/admin/vimeo-collaborators/COLLAB_ID" \
  -H "Authorization: Bearer TOKEN" | jq
```

### 4. UI (aceitação)
1. Home: informar Vimeo User ID → Adicionar → Atualizar (sync tudo) → ver status “Última atualização … / X vitrines / Y vídeos”.
2. F5: dados permanecem (cache no Postgres).
3. Vitrines: busca (debounce 300ms) e paginação (Anterior/Próximo).
4. Clicar “Vídeos” numa vitrine → modal com lista de vídeos (thumbs, nome, duração, copiar link), busca e paginação.
5. Colaborador selecionado fica em `localStorage` (só preferência; permissões no backend).

---

## Garantias

- **Sync** é a única rota que chama a API do Vimeo (`vimeoGet`). As rotas de listagem (`GET /showcases`, `GET /showcases/:showcaseId/videos`) leem apenas do banco.
- Token Vimeo nunca vai para o frontend.
- Respostas padronizadas `{ ok: true, data }` / `{ ok: false, error: { code, message } }`.
- Admin-only em `/admin/*` com o `preHandler` existente.
- Player/SCORM e Docker/pipeline não foram alterados.

---

## Deploy Coolify

- Nenhuma alteração em Docker/pipeline. Rodar `prisma migrate deploy` (ou equivalente) no deploy para criar as novas tabelas `VimeoCollaboratorVideo` e `VimeoCollaboratorShowcaseVideo`.
