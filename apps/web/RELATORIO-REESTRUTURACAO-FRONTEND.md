# RELATORIO DE REESTRUTURACAO DO FRONTEND (UNICV STUDIO)

## Escopo e restricoes consideradas

- Foco no frontend React/Vite em `apps/web`.
- `packages/player/*` tratado como estavel (sem alteracoes).
- Backend nao sera alterado agora; apenas mapeamento de contratos/endpoints existentes.
- Premissa de monorepo/workspaces e build Linux case-sensitive.
- Prioridade: simplicidade, consistencia, manutencao e padrao SaaS.

---

## A) Mapa do front atual (inventario)

### Onde esta o front React e se ha outros fronts

- Front React principal: `apps/web`.
- Outros componentes com interface no repo:
  - `packages/player` (HTML/CSS/JS estatico, LTI/embed/produto).
  - `apps/api` (backend Fastify, nao frontend).
- Conclusao: para a vitrine publica em React, o alvo correto e `apps/web`.

### Stack real identificada

- Build/tooling: Vite 6 (`apps/web/vite.config.ts`).
- UI runtime: React 19 + React DOM 19.
- Roteamento: React Router DOM 7 (`BrowserRouter`, `Routes`, `Route`).
- Estado global: Zustand 5 (`apps/web/src/store/vitrinesStore.ts`).
- HTTP: `fetch` nativo centralizado em `apps/web/src/api/base.ts`.
- Nao identificado: Axios, TanStack Query, Redux, Next.js.

### Scripts e execucao local

#### Scripts da raiz (`package.json`)

- `npm run dev`: sobe API + WEB em paralelo.
- `npm run build`: build de API e WEB.
- `npm run lint`: ESLint em `apps/api/src` e `apps/web/src`.
- `npm run doctor`: diagnostico local (`scripts/doctor.js`).
- `npm run smoke`: smoke test (`scripts/smoke.js`).

#### Scripts de `apps/web/package.json`

- `npm run dev`: Vite dev server.
- `npm run build`: `tsc -p tsconfig.json && vite build` + validacao de `dist/index.html`.
- `npm run preview`: preview local em `4173`.

### Versao de Node recomendada

- Nao existe `.nvmrc` no repo.
- Nao existe `engines.node` nos `package.json` verificados.
- Recomendacao para reestruturacao: fixar Node LTS (ex.: 20.x) com `.nvmrc` e/ou `engines` para reduzir drift entre ambientes.

### Estrutura principal de `apps/web/src`

```text
apps/web/src
├── api/
├── components/
│   ├── app/
│   ├── layout/
│   └── ui/
├── contexts/
├── hooks/
├── layouts/
├── lib/
├── pages/
│   ├── admin/config/sections/
│   ├── dashboard/
│   ├── exportacoes/
│   ├── home/
│   ├── login/
│   ├── tools/
│   └── vitrines/
├── routes/
├── store/
├── styles/
├── types/
├── App.tsx
└── main.tsx
```

### Roteamento atual

- Router manual (nao file-based) em `apps/web/src/routes/index.tsx`.
- Rotas existentes:
  - `/login` (pagina de login).
  - `/` (Home, protegida por token).
  - `/vitrines/:id`
  - `/ferramentas`
  - `/exportacoes`
  - `/dashboard`
  - `/admin/config`
- `App.tsx` usa `BrowserRouter` + `ThemeProvider`.
- Nao existe rota React para `/p/:slug` atualmente.

### Como o front acessa a API hoje

- Base URL resolvida em `apps/web/src/api/base.ts`:
  - `window.__UNICV_API_BASE`
  - `VITE_API_BASE_URL` / `VITE_API_BASE`
  - `VITE_SERVICE_URL_API` / `VITE_SERVICE_FQDN_API`
  - fallback: `http://localhost:3002`
- URL publica (`PUBLIC_BASE`) resolvida por:
  - `VITE_PUBLIC_BASE_URL`
  - `window.__UNICV_PUBLIC_BASE_URL`
  - fallback para API base.
- HTTP client unico:
  - `apiGet`, `apiPost`, `apiPut`, `apiDelete` em `apps/web/src/api/base.ts`.
  - erro de rede armazenado em `__UNICV_LAST_FETCH_ERROR`.
  - 401 limpa token admin (`localStorage`).
  - deduplicacao de GET in-flight por URL.

### UI atual (design system, tema, estilo)

- Design tokens: `apps/web/src/styles/tokens.css`.
- Utilitarios: `apps/web/src/styles/utilities.css`.
- Tema dark/light: `apps/web/src/styles/themes.css` + `ThemeContext`.
- Componentes base de UI: `apps/web/src/components/ui/*`.
- Tema persiste em `localStorage` (`unicv_theme`) e aplica `data-theme` no `<html>`.
- Existe padrao de spacing/tipografia via CSS variables (tokens).

### Paginas/componentes relevantes para vitrine

- Paginas principais:
  - `apps/web/src/pages/home/HomePage.tsx`
  - `apps/web/src/pages/vitrines/VitrineDetalhePage.tsx`
  - `apps/web/src/pages/login/LoginPage.tsx`
  - `apps/web/src/pages/exportacoes/ExportacoesPage.tsx`
  - `apps/web/src/pages/dashboard/DashboardPage.tsx`
- Componentes relacionados a vitrines:
  - `apps/web/src/components/app/VitrineCard.tsx`
  - `apps/web/src/components/app/VitrineHeader.tsx`
  - `apps/web/src/components/app/VitrinePlaylistSection.tsx`
  - `apps/web/src/components/app/VitrinePreviewModal.tsx`
- Vitrine publica React: inexistente hoje.

### Tipos/interfaces existentes (Video/Playlist/Vitrine)

- `apps/web/src/types/vitrine.ts`: tipo `Vitrine` (admin/listagem).
- `apps/web/src/api/vitrines.ts`: `VitrineDetail` com `videos[]` no formato admin.
- Falta no front um tipo dedicado para contrato publico `GET /p/:slug/config`.

---

## B) Contratos e endpoints (somente mapeamento)

### Endpoints usados pelo front atual (apps/web)

- Auth/Admin:
  - `GET /v1/admin/me`
  - `POST /v1/admin/login`
- Vitrines:
  - `GET /admin/vitrines`
  - `GET /collab/vitrines`
  - `GET /v1/vitrines/:id`
  - `POST /v1/vitrines`
  - `PUT /v1/vitrines/:id`
  - `POST /v1/vitrines/:id/duplicate`
  - `POST /v1/vitrines/:id/videos`
  - `DELETE /v1/vitrines/:id/videos/:videoId`
  - `POST /v1/vitrines/:id/videos/:videoId/move`
- Vimeo:
  - `GET /v1/vimeo/status`
  - `GET /v1/vimeo/oauth/start`
  - `POST /v1/vimeo/showcases/:id/import`
  - Endpoints de colaboradores/showcases via `vimeoCollaborators.ts`
  - Endpoints admin Vimeo via `adminVimeo.ts`
- Config:
  - `GET /v1/config/status`
  - `GET /lti/config`
  - `GET /v1/config/env`
  - `PUT /v1/config/env`
- Dashboard:
  - `GET /v1/dashboard/summary`
  - `POST /v1/dashboard/events`
- Exportacoes:
  - `GET /v1/exports`
  - `GET /v1/exports/:id`
  - `POST /v1/exports/scorm12`
  - `POST /v1/exports/html`

### Endpoints publicos-alvo da vitrine

#### `GET /p/:slug/config`

- Existe no backend (`apps/api/src/modules/published/published.routes.ts`).
- Resposta real:

```json
{
  "videos": [
    {
      "id": "vimeoVideoId",
      "name": "Titulo do video",
      "thumb": "https://...",
      "duration": 123,
      "hash": "opcional"
    }
  ]
}
```

- Observacao: nao retorna `title/description/banner` da vitrine.

#### `GET /v1/playlist?vitrine_id=...`

- Existe no backend (`apps/api/src/modules/playlist/playlist.routes.ts`).
- Aceita `vitrine_id` ou `showcase_id` (ou `id` como alias).
- Resposta segue o mesmo shape de videos (`id`, `name`, `thumb`, `duration`, `hash?`).
- Hoje e o endpoint base do player legado.

### Formato real de `videos[]` e inconsistencias

- Contrato publico (`/p/:slug/config` e `/v1/playlist`):
  - `id`, `name`, `thumb`, `duration:number`, `hash?`.
- Contrato admin (`VitrineDetail`):
  - `video.id`, `video.title`, `video.durationSec`, `video.thumbnailUrl`, `video.vimeoVideoId`.
- Inconsistencias relevantes:
  - naming diferente (`name` vs `title`, `thumb` vs `thumbnailUrl`, `duration` vs `durationSec`).
  - payload publico nao traz `createdAt` por video, impactando sort por recentes/antigos.
  - padrao de data no front observado em camelCase (`createdAt`), sem evidencias de `created_at` nos contratos principais consumidos pelo web.

---

## C) Gaps e dividas tecnicas no frontend

### Problemas principais

- Acoplamento elevado entre UI + fetch + regra de negocio em paginas grandes (especialmente `HomePage.tsx`).
- Falta de camada por feature (`src/features/*`) para separar dominio da vitrine publica.
- Tipagem parcial para contratos publicos (faltam tipos dedicados para `/p/:slug/config`).
- Estados de loading/error/empty/retry nao padronizados para a futura vitrine publica.
- Uso de `(import.meta as any).env` reduz seguranca de tipo para env.
- Barrel exports amplos podem crescer para ciclos/acroplamento se expandir sem regra.

### Riscos de build/deploy (Coolify/Linux)

- Build Linux e case-sensitive: qualquer import com casing incorreto quebra no deploy.
- Ausencia de pin de Node (sem `.nvmrc`/`engines`) pode causar variacao local/CI.
- Dependencia de envs de build/deploy sem validacao centralizada no front.

### Checklist do que precisa arrumar antes da reestruturacao pesada

1. Congelar baseline de build/lint sem erros em ambiente Linux/case-sensitive.
2. Definir e documentar versao de Node do projeto.
3. Tipar contrato publico da vitrine (`PublicVitrineConfig`/`PublicVideo`).
4. Definir arquitetura alvo por feature antes de mover codigo.
5. Garantir strategy de fallback para ordenacao sem `createdAt`.

---

## D) Proposta de arquitetura "padrao alto" para `apps/web`

### Estrutura proposta

```text
apps/web/src
├── pages/
│   ├── p/
│   │   └── PublicVitrinePage.tsx
│   └── ... (demais rotas)
├── features/
│   └── vitrine/
│       ├── api/
│       ├── hooks/
│       ├── components/
│       ├── model/
│       └── utils/
├── components/
│   ├── ui/
│   └── layout/
├── lib/
│   ├── api/
│   └── env/
├── types/
├── styles/
└── routes/
```

### Diretrizes

- Rotas em `pages`, com logica de dominio na feature (`features/vitrine`).
- `components/ui` como design system estavel/reutilizavel.
- `lib/api` para infraestrutura HTTP compartilhada.
- `lib/env` para normalizacao/validacao de envs de frontend.
- `types` para contratos cross-feature.
- Naming:
  - Componentes: `PascalCase`.
  - Hooks/funcoes: `camelCase`.
  - Arquivos por contexto (evitar arquivos "misc").
- Barrel exports:
  - Permitidos de forma local/controlada.
  - Evitar barrel unico global para reduzir ciclos.

---

## E) Escopo funcional da vitrine publica em React

### Comportamento desejado (sem implementar agora)

- Nova rota SPA: `/p/:slug`.
- Deep-link funcionando direto via navegador (BrowserRouter + configuracao de fallback no servidor web).
- Layout moderno:
  - header (titulo/subtitulo quando houver),
  - busca,
  - ordenacao,
  - grid responsivo.
- Busca client-side por titulo (`name`/`title` normalizado).
- Ordenacao:
  - recentes/antigos (com fallback quando sem `createdAt`),
  - curtos/longos por `duration`.
- Modal de player Vimeo (iframe):
  - abre ao clicar no card,
  - `ESC` fecha,
  - limpar `src` ao fechar para encerrar playback.
- Estados obrigatorios:
  - skeleton loading,
  - empty state,
  - error state com botao retry.
- Persistencia opcional:
  - sort e theme (localStorage).
- SEO minimo em SPA:
  - `document.title`,
  - meta basica apenas se infraestrutura atual suportar sem dependencia nova.
- Tradeoff documentado:
  - SPA pura tem SEO inferior a SSR para indexacao profunda.

---

## F) Plano de execucao (5-8 passos, pequeno e verificavel)

### Passo 1

- Objetivo: estabilizar baseline (build/lint/case-sensitive).
- Arquivos afetados: apenas correcoes de imports/typing pontuais se necessarias.
- Validacao:
  - `pnpm -C apps/web build`
  - `pnpm run lint`
- Resultado esperado: build e lint sem falhas.

### Passo 2

- Objetivo: criar tipos e client da vitrine publica.
- Arquivos afetados (propostos):
  - `apps/web/src/types/publicVitrine.ts` (ou consolidar em `types/vitrine.ts`)
  - `apps/web/src/features/vitrine/api/getPublicConfig.ts`
- Validacao: `pnpm -C apps/web build`
- Resultado esperado: contrato publico tipado e consumivel.

### Passo 3

- Objetivo: adicionar rota `/p/:slug` no React.
- Arquivos afetados:
  - `apps/web/src/routes/index.tsx`
  - `apps/web/src/pages/p/PublicVitrinePage.tsx`
- Validacao: `pnpm -C apps/web dev` + acesso direto em `/p/<slug>`.
- Resultado esperado: rota publica renderiza a pagina.

### Passo 4

- Objetivo: implementar fetch + estados (loading/error/empty/retry).
- Arquivos afetados:
  - `apps/web/src/features/vitrine/hooks/*`
  - `apps/web/src/pages/p/PublicVitrinePage.tsx`
- Validacao: testes manuais com slug valido/invalido.
- Resultado esperado: UX resiliente em todos os estados.

### Passo 5

- Objetivo: busca, sort e fallback sem `createdAt`.
- Arquivos afetados: `features/vitrine/model|utils`.
- Validacao: cenarios com dados reais e sem datas.
- Resultado esperado: ordenacao previsivel e sem quebra.

### Passo 6

- Objetivo: modal player Vimeo (ESC + limpeza de `src`).
- Arquivos afetados: `features/vitrine/components/PublicVideoModal.tsx`.
- Validacao: abrir/fechar modal e confirmar stop do video.
- Resultado esperado: comportamento acessivel e sem playback residual.

### Passo 7

- Objetivo: acabamento (SEO minimo, persistencias opcionais e ajustes finais).
- Arquivos afetados: pagina publica + utilitarios.
- Validacao:
  - `pnpm -C apps/web build`
  - `pnpm run lint`
- Resultado esperado: entrega pronta para PR/deploy.

---

## G) Riscos e decisoes que precisam confirmacao

1. Confirmar se a rota publica em React (`/p/:slug`) deve conviver com o endpoint atual backend `GET /p/:slug` (HTML legacy) ou substitui-lo.
2. Confirmar se sera SPA sem SSR (premissa atual: sim, sem SSR agora).
3. Confirmar se slug publico usara mesmo dominio do app ou dominio/subdominio dedicado.
4. Confirmar campos funcionais da Vitrine publica (titulo, descricao, banner). Hoje `GET /p/:slug/config` so devolve `videos`.
5. Confirmar regra de ordenacao "recentes/antigos" na ausencia de `createdAt` em `videos`.

---

## TREE (pastas mais relevantes)

```text
Studio
├── apps
│   ├── api
│   └── web
│       ├── src
│       │   ├── api
│       │   ├── components
│       │   │   ├── app
│       │   │   ├── layout
│       │   │   └── ui
│       │   ├── contexts
│       │   ├── hooks
│       │   ├── layouts
│       │   ├── lib
│       │   ├── pages
│       │   ├── routes
│       │   ├── store
│       │   ├── styles
│       │   └── types
│       ├── package.json
│       └── vite.config.ts
├── packages
│   └── player
└── infra
    └── docker
```

---

## Env vars usadas no front

| Variavel | Onde aparece/uso | Obrigatoria? | Observacao |
|---|---|---|---|
| `VITE_API_BASE_URL` | `apps/web/src/api/base.ts`, `.env.development` | Sim (recomendada) | Base principal para API no web |
| `VITE_API_BASE` | `apps/web/src/api/base.ts` | Nao | Fallback alternativo |
| `VITE_SERVICE_URL_API` | `apps/web/src/api/base.ts` | Nao | Fallback por URL completa |
| `VITE_SERVICE_FQDN_API` | `apps/web/src/api/base.ts` | Nao | Fallback por FQDN |
| `VITE_PUBLIC_BASE_URL` | `apps/web/src/api/base.ts`, `.env.development` | Nao (mas recomendada em prod) | Base para links publicos (`/p/:slug` / player) |
| `window.__UNICV_API_BASE` | `apps/web/public/config.js`, `api/base.ts` | Nao | Injetavel em runtime |
| `window.__UNICV_PUBLIC_BASE_URL` | `apps/web/public/config.js`, `api/base.ts`, `AppLayout.tsx` | Nao | Injetavel em runtime |

---

## Build sanity (frontend)

### Comandos base

```bash
pnpm -C apps/web build
pnpm run lint
```

Alternativas com npm (workspaces):

```bash
npm run build --workspace=apps/web
npm run lint
```

### Erros comuns em Linux/case-sensitive e correcao

- Sintoma: funciona no Windows/macOS e quebra no deploy Linux.
- Causa comum: import com case divergente do nome real do arquivo.
- Como corrigir:
  1. conferir nome real do arquivo/pasta (`Button.tsx` vs `button.tsx`);
  2. alinhar todos os imports ao case exato;
  3. evitar renomear apenas mudando case sem passo intermediario em Git quando necessario;
  4. revalidar com `pnpm -C apps/web build`.

---

## Resumo curto (o que fazer primeiro)

1. O frontend React esta centralizado em `apps/web` com Vite/React Router/Zustand e HTTP via `fetch`.
2. A vitrine publica em React ainda nao existe; hoje `/p/:slug` e servido pelo backend.
3. O endpoint publico para dados existe: `GET /p/:slug/config`.
4. Esse endpoint retorna so `videos[]` (`id`, `name`, `thumb`, `duration`, `hash?`), sem metadados da vitrine.
5. Ha diferenca de contratos entre admin e publico (naming/campos).
6. Reestruturacao recomendada: separar por feature (`features/vitrine`) e manter design system em `components/ui`.
7. Definir tipagem dedicada para contrato publico antes de implementar pagina.
8. Implementar rota `/p/:slug` com estados de loading/error/empty/retry.
9. Adicionar busca, sort (com fallback sem `createdAt`) e modal Vimeo com ESC + limpeza de src.
10. Aplicar SEO minimo via `document.title` enquanto SSR nao for escopo.
11. Evitar qualquer mudanca em `packages/player` e backend nesta fase.
12. Garantir build/lint em ambiente case-sensitive para evitar falha em Coolify.

---

## PRIMEIRO PASSO RECOMENDADO

**Passo unico inicial:** estabilizar baseline de qualidade/build do frontend antes da nova vitrine.

### Comandos

```bash
pnpm -C apps/web build
pnpm run lint
```

### Resultado esperado

- Build do `apps/web` concluido sem erro.
- Lint do monorepo sem erros bloqueantes.
- Base confiavel para iniciar a implementacao da rota publica `/p/:slug` com menor risco de regressao.
