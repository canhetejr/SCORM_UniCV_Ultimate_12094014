# Entrega: Colaboradores Vimeo + cache de vitrines + link para editor

## Arquivos alterados / criados

### Banco (Prisma)
- `studio/api/prisma/schema.prisma` — adicionados models `VimeoCollaborator` e `VimeoCollaboratorShowcase`
- `studio/api/prisma/migrations/20260218000000_add_vimeo_collaborators/migration.sql` — migração criada

### Backend (API)
- `studio/api/src/services/vimeo.ts` — `vimeoGet` com `timeoutMs` opcional e `retryAfter` no erro 429
- `studio/api/src/routes/adminVimeoCollaborators.ts` — **novo**: rotas admin de colaboradores e cache
- `studio/api/src/server.ts` — registro das rotas em `/admin/vimeo-collaborators`

### Frontend (Web)
- `studio/web/src/api/vimeoCollaborators.ts` — **novo**: client da API de colaboradores
- `studio/web/src/api/index.ts` — export do módulo `vimeoCollaborators`
- `studio/web/src/pages/home/HomePage.tsx` — Home unificada (colaborador, grid paginado, busca, Editar → editor)

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
Substitua `TOKEN` pelo token obtido em `POST /v1/admin/login`.

```bash
# A) Criar colaborador
curl -s -X POST "http://localhost:3002/admin/vimeo-collaborators" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"vimeoUserId":"82076795","label":"Meu Colab"}' | jq

# B) Listar colaboradores
curl -s "http://localhost:3002/admin/vimeo-collaborators" \
  -H "Authorization: Bearer TOKEN" | jq

# C) Sync (id = id do colaborador retornado em A/B)
curl -s -X POST "http://localhost:3002/admin/vimeo-collaborators/COLLAB_ID/sync" \
  -H "Authorization: Bearer TOKEN" | jq

# D) Listar vitrines em cache (paginado)
curl -s "http://localhost:3002/admin/vimeo-collaborators/COLLAB_ID/showcases?page=1&perPage=12&q=" \
  -H "Authorization: Bearer TOKEN" | jq

# E) Link showcase → vitrine do Studio (abre no editor)
curl -s -X POST "http://localhost:3002/admin/vimeo-collaborators/COLLAB_ID/showcases/VIMEO_SHOWCASE_ID/link" \
  -H "Authorization: Bearer TOKEN" | jq

# F) Remover colaborador
curl -s -X DELETE "http://localhost:3002/admin/vimeo-collaborators/COLLAB_ID" \
  -H "Authorization: Bearer TOKEN" | jq
```

---

## Aceitação

1. Digitar "user82076795" (ou só números) → Adicionar → colaborador fica salvo no banco.
2. Selecionar o colaborador depois de dias → lista continua no cache (banco).
3. Lista paginada (12/16 por página) com busca (q).
4. Clicar "Editar" numa vitrine → abre o editor existente do Studio (cria/liga Vitrine se necessário).
5. "Atualizar vitrines" faz sync completo do Vimeo (paginação 100/página, 429 com Retry-After).
6. Player e Docker não foram alterados.

---

## Deploy Coolify

- Nenhuma alteração em Docker/pipeline. A migração deve ser aplicada no deploy (ex.: passo `prisma migrate deploy` no start ou no job de release).
- Garantir que `DATABASE_URL` está configurado e que as novas tabelas são criadas com `prisma migrate deploy` antes ou durante o start da API.
