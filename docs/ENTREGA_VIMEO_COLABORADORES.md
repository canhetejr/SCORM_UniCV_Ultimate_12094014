# Entrega: Colaboradores Vimeo + cache completo (vitrines + vídeos)

## Arquivos alterados / criados

### Banco (Prisma)
- `apps/api/prisma/schema.prisma` — models `VimeoCollaborator`, `VimeoCollaboratorShowcase`; **novos**: `VimeoCollaboratorVideo`, `VimeoCollaboratorShowcaseVideo`
- `apps/api/prisma/migrations/20260218000000_add_vimeo_collaborators/migration.sql` — migração original
- `apps/api/prisma/migrations/20260218120000_add_vimeo_collaborator_videos/migration.sql` — **novo**: tabelas de vídeos e join showcase↔video

### Backend (API)
- `apps/api/src/routes/adminVimeoCollaborators.ts` — rotas admin; **sync completo** (vitrines + vídeos com paginação, 429 retry, máx. 2 vitrines em paralelo); **novo endpoint** `GET /:id/showcases/:showcaseId/videos` (cache); GET colaboradores passa a incluir `videoCount`
- `apps/api/src/server.ts` — (sem alteração nesta entrega; rotas já registradas)
- `apps/api/src/services/vimeo.ts` — (sem alteração; já tinha timeout e 429)

### Frontend (Web)
- `apps/web/src/api/vimeoCollaborators.ts` — tipo `videoCount`; tipo e retorno de `syncCollaborator` (showcasesFetched, videosFetched, etc.); **novo** `getShowcaseVideos` e tipo `VimeoCollaboratorVideoItem`
- `apps/web/src/pages/home/HomePage.tsx` — status "Última atualização / total vitrines / total vídeos"; colaborador persistido em `localStorage`; busca vitrines com debounce 300ms; botão "Vídeos" no card → modal com lista de vídeos (busca debounce, paginação, thumb + nome + duração + copiar link)

---

## Comandos de teste

Ver documento original para curl e UI. Deploy: nenhuma alteração em Docker; rodar `prisma migrate deploy` para novas tabelas.
