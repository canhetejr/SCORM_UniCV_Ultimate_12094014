# Entrega — Reestruturação e padronização do monorepo UNICV Studio

## 1. Arquivos deletados

| Item | Motivo |
|------|--------|
| `LIMPEZA_ESTRUTURAL_ENTREGA.md` | Documento de entrega anterior |
| Pasta `studio/` (e conteúdo) | Removida; documentação já estava em `docs/` |
| Pasta `dist/` (raiz) | Artefato de build |
| Pasta `tools/legacy/` | Vazia; removida |

**Nota:** Se `.env` estiver versionado, execute `git rm --cached .env` e confirme que `.env` está no `.gitignore`.

---

## 2. Arquivos movidos

| De | Para |
|----|------|
| (Nenhum movimento de ficheiros entre pastas nesta fase) | — |

**FASE 3 (parcial):** Utilitários e constantes extraídos de `HomePage.tsx` para ficheiros no mesmo diretório:

| Novo ficheiro | Conteúdo |
|---------------|----------|
| `apps/web/src/pages/home/constants.ts` | PER_PAGE_OPTIONS, DEFAULT_PER_PAGE, SEARCH_DEBOUNCE_MS, COLLAB_STORAGE_KEY, etc. |
| `apps/web/src/pages/home/utils.ts` | getErrorMessage, isInteractiveTarget, filterAndSortVitrines, getBestThumb, getVideoThumb, formatDuration |

---

## 3. Estrutura final (tree até 3 níveis)

```
.
├── apps/
│   ├── api/
│   └── web/
├── packages/
│   └── player/
├── infra/
│   ├── coolify/
│   └── docker/
├── tools/
│   └── build-packages.js
├── docs/
├── scripts/
├── .dockerignore
├── .editorconfig
├── .env.example
├── .gitignore
├── .gitattributes
├── .prettierrc
├── .prettierignore
├── eslint.config.mjs
├── package.json
├── package-lock.json
├── README.md
├── LICENSE
```

Raiz: apenas os ficheiros acima (e `.env` local, não versionado).

---

## 4. Ficheiros grandes identificados / parcialmente divididos

| Ficheiro | Linhas (aprox.) | Ação |
|----------|------------------|------|
| `apps/web/src/pages/home/HomePage.tsx` | ~725 (era 801) | Extraídos `constants.ts` e `utils.ts`; página ainda grande — candidata a extrair `CollaboratorsCard`, `ShowcasesCacheCard`, `VideosModal`, `MinhasVitrinesSection` |
| `apps/api/src/routes/adminVimeoCollaborators.ts` | 511 | A dividir: rotas vs. serviços vs. tipos |
| `apps/web/src/pages/tools/ToolsPage.tsx` | 500 | A dividir por secções / componentes |
| `apps/web/src/pages/dashboard/DashboardPage.tsx` | 456 | A dividir por secções |
| `apps/web/src/pages/vitrines/VitrineDetalhePage.tsx` | 448 | A dividir por secções |
| `apps/api/src/routes/adminVimeo.ts` | 354 | A dividir: handler vs. serviço |
| `apps/api/src/routes/vitrines.ts` | 352 | A dividir: handler vs. serviço |

Nenhum outro ficheiro foi dividido nesta fase além de `HomePage` (utils + constants).

---

## 5. Pontos que podem quebrar em runtime

| Ponto | Mitigação |
|-------|-----------|
| **Imports em HomePage** | Verificar que `./constants` e `./utils` resolvem (paths relativos no mesmo diretório). |
| **ESLint** | `npm install` instala novas devDependencies; `npm run lint` pode reportar erros até o código ser ajustado. |
| **Prettier** | `npm run format` altera formatação; pode gerar muitos diffs na primeira execução. |
| **Pasta `studio/` removida** | Qualquer script ou doc que referencie `studio/` deve usar `docs/` ou `apps/`. |
| **`.env`** | Se estava versionado, foi removido do tracking; cada ambiente precisa de cópia de `.env.example`. |

---

## 6. TODOs arquiteturais para próxima fase

### Backend (apps/api)

- [ ] Reorganizar por domínio: `src/modules/{auth,vitrines,vimeo,exports,dashboard,lti,xapi}` com rota + service + acesso a dados por módulo.
- [ ] Criar `src/infra/{prisma,config,logger}` (manter `prisma/` em `apps/api/prisma` para o CLI; infra = uso do client/config).
- [ ] Criar `src/shared/{utils,errors}` e mover helpers/erros partilhados.
- [ ] Dividir ficheiros com &gt;400 linhas: `adminVimeoCollaborators.ts`, `adminVimeo.ts`, `vitrines.ts`.
- [ ] Separar claramente: rota (HTTP) → service (regras) → Prisma (acesso a dados).

### Frontend (apps/web)

- [ ] Reorganizar por feature: `src/app/`, `src/features/{vitrines,exports,dashboard,config,auth}/`, `src/shared/{ui,hooks,lib,styles}`.
- [ ] Dividir páginas &gt;400 linhas: `HomePage.tsx` (em componentes por secção), `ToolsPage.tsx`, `DashboardPage.tsx`, `VitrineDetalhePage.tsx`.
- [ ] Remover imports circulares (analisar com ESLint ou ferramenta de dependências).
- [ ] Centralizar API client (ex.: um único `api/client.ts` ou por domínio em `features/*/api.ts`).

### Geral

- [ ] Correr `npm run format` e corrigir conflitos antes de commitar.
- [ ] Corrigir avisos/erros de `npm run lint` (ex.: unused vars, any).
- [ ] Manter apenas scripts principais no root: dev, build, clean, doctor, smoke (+ postinstall e build:packages/lint/format conforme necessário).

---

## Resumo

- **FASE 1:** Limpeza absoluta — removidos `studio/`, `dist/` raiz, `tools/legacy`, documento de entrega antigo; `.gitignore` reforçado.
- **FASE 2:** Estrutura alinhada com o padrão definido; raiz sem ficheiros soltos além dos listados.
- **FASE 3:** Parcial — extraídos `constants.ts` e `utils.ts` de `HomePage.tsx`; reorganização completa por módulos/features fica como TODO.
- **FASE 4:** ESLint (flat config) + Prettier no root; scripts `lint` e `format` adicionados.
- **FASE 5:** Scripts simplificados; mantidos dev, build, clean, doctor, smoke, postinstall, build:packages, lint, format.
- **Player:** Nenhuma alteração em `packages/player`.
- **Legados:** Nenhum ficheiro legado reintroduzido.
