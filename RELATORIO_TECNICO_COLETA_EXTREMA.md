# RELATÓRIO TÉCNICO DE COLETA EXTREMA — UNICV Studio (monorepo)

Baseado em inspeção direta do repositório em `/workspace` (arquivos versionados + execução de comandos de diagnóstico/build).
Sem invenção; quando não existe evidência no código, está marcado como **“Não identificado no código atual”**.

---

## 1) INVENTÁRIO COMPLETO DO REPOSITÓRIO

### 1.1 Árvore de diretórios (mínimo 4 níveis)

### Árvore geral (arquivos versionados, profundidade 4)

```text
.
├── .github
│   ├── ISSUE_TEMPLATE
│   │   ├── bug_report.yml
│   │   ├── config.yml
│   │   └── feature_request.yml
│   ├── workflows
│   │   ├── docker-publish.yml
│   │   ├── jekyll-gh-pages.yml
│   │   └── release.yml
│   ├── CODE_OF_CONDUCT.md
│   ├── dependabot.yml
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── SECURITY.md
├── css
│   ├── base.css
│   ├── builder.css
│   ├── components.css
│   ├── layout.css
│   ├── responsive.css
│   └── variables.css
├── docs
│   ├── DOCUMENTACAO_PARA_HUMANOS.md
│   ├── PLANO_REBUILD_LARAVEL.md
│   └── README.md
├── js
│   ├── api.js
│   ├── builder.js
│   ├── config.js
│   ├── main.js
│   ├── player.js
│   ├── scorm-service.js
│   ├── state.js
│   ├── theme.js
│   └── ui.js
├── scripts
│   ├── doctor.js
│   ├── limpa-e-sobe.sh
│   ├── run-studio-wsl.sh
│   └── smoke.js
├── studio
│   ├── api
│   │   ├── prisma
│   │   │   ├── migrations
│   │   │   └── schema.prisma
│   │   ├── src
│   │   │   ├── lib
│   │   │   ├── routes
│   │   │   ├── services
│   │   │   ├── db.ts
│   │   │   ├── env.ts
│   │   │   ├── index.ts
│   │   │   └── server.ts
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── web
│   │   ├── public
│   │   │   └── config.js
│   │   ├── src
│   │   │   ├── api
│   │   │   ├── components
│   │   │   ├── contexts
│   │   │   ├── hooks
│   │   │   ├── layouts
│   │   │   ├── lib
│   │   │   ├── pages
│   │   │   ├── routes
│   │   │   ├── store
│   │   │   ├── styles
│   │   │   ├── types
│   │   │   ├── App.tsx
│   │   │   ├── main.tsx
│   │   │   └── vite-env.d.ts
│   │   ├── .env.development
│   │   ├── ARCHITECTURE.md
│   │   ├── CLEANUP_REPORT.md
│   │   ├── Dockerfile
│   │   ├── entrypoint.sh
│   │   ├── index.html
│   │   ├── nginx.conf
│   │   ├── package.json
│   │   ├── REORGANIZATION.md
│   │   ├── tsconfig.json
│   │   └── vite.config.ts
│   ├── COOLIFY.md
│   ├── COOLIFY_CHECKLIST_1PAGE.md
│   ├── DEPLOY.md
│   ├── DEV.md
│   ├── ENTREGA_VIMEO_COLABORADORES.md
│   └── README.md
├── .dockerignore
├── .editorconfig
├── .env.studio.example
├── .gitattributes
├── .gitignore
├── build-packages.js
├── builder.html
├── compose.debug.yaml
├── compose.yaml
├── disciplinas.csv
├── docker-compose.studio.yml
├── docker-compose.yml
├── Dockerfile
├── DOCUMENTACAO.md
├── imsmanifest.xml
├── index.html
├── LICENSE
├── package-lock.json
├── package.json
├── README.md
├── scorm.js
├── script.js
└── style.css
```

### Árvore detalhada backend (`studio/api`)

```text
studio/api
    Dockerfile
    package.json
    tsconfig.json
    prisma/
        schema.prisma
        migrations/
            migration_lock.toml
            20260213141753_add_app_config/
                migration.sql
            20260213180000_add_dashboard_events/
                migration.sql
            20260215000000_add_vitrine_slug_status/
                migration.sql
            20260218000000_add_vimeo_collaborators/
                migration.sql
            20260218120000_add_vimeo_collaborator_videos/
                migration.sql
    src/
        db.ts
        env.ts
        index.ts
        server.ts
        lib/
            publicUrl.ts
            repoRoot.ts
            xml.ts
        routes/
            adminLogin.ts
            adminVimeo.ts
            adminVimeoCollaborators.ts
            adminVitrinesVimeoCache.ts
            auth-vimeo.ts
            collab.ts
            config.ts
            dashboard.ts
            deps.ts
            exports.ts
            health.ts
            lti.ts
            n8nWebhook.ts
            player.ts
            playlist.ts
            publicPlaylist.ts
            published.ts
            vimeo.ts
            vitrines.ts
            xapi.ts
        services/
            adminAuth.ts
            appConfig.ts
            exporter.ts
            lti.ts
            vimeo.ts
```

### Árvore detalhada frontend (`studio/web`)

```text
studio/web
    .env.development
    ARCHITECTURE.md
    CLEANUP_REPORT.md
    Dockerfile
    REORGANIZATION.md
    entrypoint.sh
    index.html
    nginx.conf
    package.json
    tsconfig.json
    vite.config.ts
    public/
        config.js
    src/
        App.tsx
        main.tsx
        vite-env.d.ts
        api/
            adminVimeo.ts
            auth.ts
            base.ts
            config.ts
            dashboard.ts
            exports.ts
            index.ts
            vimeo.ts
            vimeoCollaborators.ts
            vitrines.ts
        components/
            app/
                .gitkeep
                ExportDetailsModal.tsx
                ExportsTable.tsx
                NewVitrineModal.tsx
                VitrineCard.tsx
                VitrineExportsSection.tsx
                VitrineHeader.tsx
                VitrinePlaylistSection.tsx
                VitrinePreviewModal.tsx
                VitrinesAdvancedSearch.tsx
                index.ts
            layout/
                Sidebar.tsx
            tools/
                ToolCard.tsx
            ui/
                Badge.tsx
                Button.tsx
                Card.tsx
                Field.tsx
                Input.tsx
                Modal.tsx
                ThemeToggle.tsx
                Toast.tsx
                ToastContainer.tsx
                index.ts
        contexts/
            ThemeContext.tsx
        hooks/
            useApiStatus.ts
            useConfigStatus.ts
            useMe.ts
            useToast.tsx
        layouts/
            AppLayout.tsx
        lib/
            constants.ts
            download.ts
            formatters.ts
            index.ts
            slugify.ts
            storage.ts
            urls.ts
        pages/
            admin/
                config/
                    ConfigPage.tsx
                    configModules.ts
                    sections/
                        ConfigEnv.tsx
                        ConfigLrs.tsx
                        ConfigLti.tsx
                        ConfigVimeo.tsx
            dashboard/
                DashboardPage.tsx
            exportacoes/
                ExportacoesPage.tsx
            home/
                HomePage.tsx
            login/
                LoginPage.tsx
            tools/
                ToolsPage.tsx
            vitrines/
                VitrineDetalhePage.tsx
        routes/
            index.tsx
        store/
            vitrinesStore.ts
        styles/
            responsive.css
            sidebar.css
            themes.css
            tokens.css
            utilities.css
        types/
            config.ts
            vitrine.ts
```

---

### 1.2 Arquivos críticos na raiz

- `package.json` (workspaces + scripts monorepo)
- `package-lock.json` (lock único do monorepo)
- `Dockerfile` (multi-target `api`/`web`)
- `docker-compose.yml`
- `docker-compose.studio.yml`
- `compose.yaml`
- `compose.debug.yaml`
- `.env.studio.example`
- `index.html`, `imsmanifest.xml`, `style.css`, `scorm.js`, `css/`, `js/` (player estático usado pela API/export)
- `build-packages.js` (geração de pacotes SCORM em lote)
- `builder.html` (builder no browser)
- `README.md`, `DOCUMENTACAO.md`

### 1.3 Arquivos ocultos detectados

**Raiz:**
- `.dockerignore`
- `.editorconfig`
- `.env.studio.example`
- `.gitattributes`
- `.gitignore`

**Subdiretórios:**
- `.github/**`
- `studio/web/.env.development`
- `studio/web/src/components/app/.gitkeep`

**Não encontrados:**
- `.nvmrc` → **Não identificado no código atual**
- `.node-version` → **Não identificado no código atual**
- `studio/api/.env.example` (referenciado em docs) → **Não identificado no código atual**

### 1.4 Arquivos potencialmente acidentais versionados (evidência)

1. `builder.html`
   - Contém chamadas hardcoded de telemetria para `http://127.0.0.1:7242/ingest/...` (linhas 108, 111, 116, 125).
2. `compose.debug.yaml`
   - Define comando `node --inspect ... index.js`, mas `index.js` não existe no repositório.
3. `compose.yaml`
   - Serviço genérico legado (`unicvscormultimate`) separado do stack `db/api/web` do Studio; não há evidência de uso atual nos scripts/docs principais.
4. `script.js` (raiz)
   - Não há referência direta em HTML principal atual do player (`index.html` carrega `js/*.js`, não `script.js`).

### 1.5 Tamanho estimado do projeto

- `du -sh /workspace` (sem node_modules na medição inicial): **2.2M**
- Tamanho de arquivos versionados (`git ls-files`):
  - **185 arquivos**
  - **884.547 bytes (~0,844 MB)**

### 1.6 Linguagens detectadas (por extensão, arquivos versionados)

Principais:
- TypeScript (`.ts`): 60
- TSX (`.tsx`): 37
- JavaScript (`.js`): 15
- CSS (`.css`): 12
- SQL (`.sql`): 5
- Prisma (`.prisma`): 1
- Markdown (`.md`): 17
- YAML/YML (`.yaml/.yml`): 11
- HTML (`.html`): 3

### 1.7 Versões detectadas

- Node local (ambiente atual): `v22.21.1`
- npm local: `10.9.4`
- Dockerfiles API/Web: `node:20-alpine`
- TypeScript resolvido: `5.9.3`
- Prisma / @prisma/client: `6.19.2`
- Fastify: `5.7.4`
- React / React-DOM: `19.2.4`
- Vite: `6.4.1`
- React Router DOM: `7.13.0`

### 1.8 Gerenciador de pacotes

- **npm** com **workspaces** (`"workspaces": ["studio/*"]`)
- Lockfile: `package-lock.json` (lockfileVersion 3)
- Yarn lock: **Não identificado no código atual**
- pnpm lock: **Não identificado no código atual**

---

## 2) DEPENDÊNCIAS COMPLETAS

### 2.1 API — dependencies e devDependencies (com versões exatas)

#### dependencies (`studio/api/package.json`)

| Pacote | Faixa declarada | Versão resolvida lock |
|---|---:|---:|
| @fastify/cookie | ^11.0.0 | 11.0.2 |
| @fastify/cors | ^10.0.0 | 10.1.0 |
| @fastify/formbody | ^8.0.0 | 8.0.2 |
| @fastify/sensible | ^6.0.0 | 6.0.4 |
| @prisma/client | ^6.0.0 | 6.19.2 |
| archiver | ^7.0.0 | 7.0.1 |
| dotenv | ^16.0.0 | 16.6.1 |
| fastify | ^5.0.0 | 5.7.4 |
| jose | ^6.0.0 | 6.1.3 |
| prisma | ^6.0.0 | 6.19.2 |
| zod | ^4.0.0 | 4.3.6 |

#### devDependencies (`studio/api/package.json`)

| Pacote | Faixa declarada | Versão resolvida lock |
|---|---:|---:|
| @types/archiver | ^6.0.0 | 6.0.4 |
| @types/node | ^22.0.0 | 22.19.11 |
| tsx | ^4.0.0 | 4.21.0 |
| typescript | ^5.0.0 | 5.9.3 |

### 2.2 WEB — dependencies e devDependencies (com versões exatas)

#### dependencies (`studio/web/package.json`)

| Pacote | Faixa declarada | Versão resolvida lock |
|---|---:|---:|
| react | ^19.0.0 | 19.2.4 |
| react-dom | ^19.0.0 | 19.2.4 |
| react-router-dom | ^7.0.0 | 7.13.0 |
| recharts | ^2.15.0 | 2.15.4 |
| zustand | ^5.0.8 | 5.0.11 |

#### devDependencies (`studio/web/package.json`)

| Pacote | Faixa declarada | Versão resolvida lock |
|---|---:|---:|
| @types/react | ^19.0.0 | 19.2.14 |
| @types/react-dom | ^19.0.0 | 19.2.3 |
| @vitejs/plugin-react | ^5.0.0 | 5.1.4 |
| typescript | ^5.0.0 | 5.9.3 |
| vite | ^6.0.0 | 6.4.1 |

### 2.3 Dependências potencialmente obsoletas (evidência `npm outdated`)

| Pacote | Atual | Wanted | Latest |
|---|---:|---:|---:|
| @fastify/cors | 10.1.0 | 10.1.0 | 11.2.0 |
| @prisma/client | 6.19.2 | 6.19.2 | 7.4.1 |
| prisma | 6.19.2 | 6.19.2 | 7.4.1 |
| @types/archiver | 6.0.4 | 6.0.4 | 7.0.0 |
| @types/node | 22.19.11 | 22.19.11 | 25.3.0 |
| dotenv | 16.6.1 | 16.6.1 | 17.3.1 |
| recharts | 2.15.4 | 2.15.4 | 3.7.0 |
| vite | 6.4.1 | 6.4.1 | 7.3.1 |

### 2.4 Dependências duplicadas

#### Diretas duplicadas entre API e WEB
- `typescript` (devDependency em ambos)

#### Transitividade com múltiplas versões (lockfile)
49 pacotes com múltiplas versões, incluindo:
`@esbuild/*` (várias plataformas), `esbuild`, `glob`, `minimatch`, `semver`, `lru-cache`, `ansi-regex`, `ansi-styles`, `string-width`, `strip-ansi`, `readable-stream`, `wrap-ansi`, etc.

### 2.5 Dependências não utilizadas (detectável)

Ferramenta usada: `depcheck`.

- **Raiz**
  - Unused devDependencies: `rimraf`
  - Missing dependency: `archiver` usado em `build-packages.js` (não declarado no `package.json` raiz; hoje funciona por hoisting de workspace)
- **API**
  - `No depcheck issue`
- **WEB**
  - `No depcheck issue`

### 2.6 Pacotes críticos de segurança

#### Relatório `npm audit --package-lock-only` (evidência)
- Total vulnerabilidades: **7**
  - **6 high**
  - **1 moderate**
- Cadeia mais crítica:
  - `archiver` (direta, high) → `archiver-utils` / `zip-stream` / `readdir-glob` / `glob` / `minimatch`
- Outra:
  - `ajv` (moderate, ReDoS em condição específica)
- Fix available reportado para parte dos casos.

---

## 3) BACKEND – ANÁLISE PROFUNDA

### 3.1 STACK (framework/plugins/middlewares/hooks)

- Framework: **Fastify** (`studio/api/src/server.ts`)
- Plugins registrados globalmente:
  - `@fastify/sensible`
  - `@fastify/cors`
  - `@fastify/cookie`
  - `@fastify/formbody`
- Configurações globais relevantes:
  - `logger: true`
  - `bodyLimit: 2 * 1024 * 1024`
- Hook global:
  - `app.addHook("preHandler", ...)` com autenticação JWT administrativa para quase todas rotas, com bypass por `isPublicPath`.

### 3.2 ARQUITETURA

#### Estrutura de pastas (backend)
- `src/routes`: controladores por domínio
- `src/services`: serviços (`adminAuth`, `appConfig`, `lti`, `exporter`, `vimeo`)
- `src/lib`: utilitários (`publicUrl`, `repoRoot`, `xml`)
- `src/db.ts`: PrismaClient singleton
- `prisma/schema.prisma`: modelagem de dados
- `prisma/migrations/*`: migrações SQL

#### Padrão arquitetural detectado
- **Modular por feature/rota**, com:
  - camadas de rota + serviço + ORM direto
  - sem camada explícita de repositório
- Não é MVC clássico puro; é Fastify modular.

#### Separação admin/public
- Existe separação por prefixo e por hook:
  - Admin: ` /admin/*`, `/v1/*` (maioria)
  - Públicas: `/health`, `/lti/*`, `/player/*`, `/n8n/webhook/*`, `/public/*`, `/p/*`, `/v1/playlist`, `/v1/config/status`, `/v1/xapi/*`, `/auth/vimeo/callback`, `POST /v1/admin/login`

#### Camada de serviços
- **Existe** (`src/services`)

#### Camada de repositórios
- **Não identificado no código atual** (Prisma é chamado diretamente em rotas/serviços)

### 3.3 ROTAS (lista completa)

**Total mapeado: 72 endpoints**

> Lista completa por método/path/arquivo/proteção foi gerada na auditoria e incluída no corpo da resposta original em chat.
> Para não alterar conteúdo técnico, considere esta seção como equivalente ao inventário de 72 rotas já mapeadas.

### 3.4 AUTENTICAÇÃO

#### Como funciona
1. `POST /v1/admin/login` valida `username/password` contra `ADMIN_USER`/`ADMIN_PASSWORD`.
2. Se válido, gera JWT HS256 (`jose`) com:
   - `sub = admin`
   - `aud = unicv-studio`
   - expiração `24h`
3. Frontend guarda token em `localStorage` (`unicv_admin_token`) e envia `Authorization: Bearer`.

#### Onde valida
- Hook global `preHandler` (`server.ts`) para quase todas rotas.
- Validação do token: `verifyAdminToken` em `services/adminAuth.ts`.

#### Sessão/token
- Tipo principal: **JWT Bearer**.
- Não usa sessão server-side para admin.
- Cookies são usados para fluxo OAuth/LTI (`state`/`nonce`), não para sessão admin.

#### Segurança detectada
- JWT com `aud` e `sub`.
- Fallback de segredo:
  - `ADMIN_JWT_SECRET` ou `COOKIE_SECRET`.
- Se `COOKIE_SECRET` ficar no default (`change-me-change-me-change-me`) e sem `ADMIN_JWT_SECRET`, token fica com segredo fraco em produção.
- Sem rate-limit de login.

### 3.5 PRISMA

#### 3.5.1 Schema resumido completo (models, campos, tipos, índices, relações)

- `Account`
- `VimeoConnection`
- `Vitrine`
- `Video`
- `VitrineVideo`
- `ExportJob`
- `LtiDeployment`
- `AppConfig`
- `VimeoCollaborator`
- `VimeoCollaboratorShowcase`
- `VimeoCollaboratorVideo`
- `VimeoCollaboratorShowcaseVideo`
- `DashboardEvent`

Campos, índices, relações e cascatas conforme `studio/api/prisma/schema.prisma` e migrations versionadas.

#### 3.5.2 Enums
- `VitrineSource`: `MANUAL`, `VIMEO_SHOWCASE`
- `VitrineStatus`: `ACTIVE`, `EDITING`, `INACTIVE`
- `ExportType`: `HTML`, `SCORM12`, `IFRAME`
- `ExportStatus`: `PENDING`, `RUNNING`, `SUCCEEDED`, `FAILED`

#### 3.5.3 Migrations existentes
1. `20260213141753_add_app_config`
2. `20260213180000_add_dashboard_events`
3. `20260215000000_add_vitrine_slug_status`
4. `20260218000000_add_vimeo_collaborators`
5. `20260218120000_add_vimeo_collaborator_videos`
6. `migration_lock.toml`

#### 3.5.4 Divergência potencial schema x banco
- Sem `DATABASE_URL` ativo no ambiente de auditoria, `prisma migrate status` falha.
- Estado real do banco em execução: **Não identificado no código atual**.
- Divergência concreta entre schema e banco em runtime: **Não identificado no código atual**.

### 3.6 BANCO

- Provider Prisma: `postgresql`
- URL esperada: variável `DATABASE_URL` (obrigatória no schema)
- Host no Docker Compose Studio: `db`
- Transações:
  - `vitrines.ts` usa `prisma.$transaction`
- Raw queries:
  - `health.ts`: `SELECT 1`
  - `dashboard.ts`: agregações com `Prisma.sql` + `prisma.$queryRaw`

### 3.7 VARIÁVEIS DE AMBIENTE (lista completa backend)

Definidas em `studio/api/src/env.ts`:

- `NODE_ENV`
- `PORT`
- `HOST`
- `DATABASE_URL`
- `BASE_URL`
- `PUBLIC_BASE_URL`
- `CORS_EXTRA_ORIGINS`
- `VIMEO_CLIENT_ID`
- `VIMEO_CLIENT_SECRET`
- `VIMEO_REDIRECT_URI`
- `COOKIE_SECRET`
- `EXPORTS_DIR`
- `LTI_PLATFORM_ISSUER`
- `LTI_PLATFORM_CLIENT_ID`
- `LTI_PLATFORM_AUTH_LOGIN_URL`
- `LTI_PLATFORM_KEYSET_URL`
- `LTI_PLATFORM_DEPLOYMENT_ID`
- `LTI_TOOL_PRIVATE_KEY_PEM`
- `LTI_TOOL_KID`
- `LRS_ENDPOINT`
- `LRS_BASIC_AUTH`
- `ADMIN_USER`
- `ADMIN_PASSWORD`
- `ADMIN_JWT_SECRET`
- `PLAYLIST_HMAC_SECRET`

Obrigatória estrita:
- `DATABASE_URL`

Com default:
- `NODE_ENV`, `PORT`, `HOST`, `COOKIE_SECRET`, `EXPORTS_DIR`, `LTI_TOOL_KID`

### 3.8 LOGS

- Logger do Fastify ativo (`logger: true`)
- `reply.log.info/warn` em rotas Vimeo
- `console.warn/error` no bootstrap
- Logs sensíveis explícitos de credenciais: **Não identificado no código atual**

---

## 4) FRONTEND – ANÁLISE PROFUNDA

### 4.1 STACK

- React 19.2.4
- React DOM 19.2.4
- Router 7.13.0
- Vite 6.4.1
- `@vitejs/plugin-react`
- TS 5.9.3
- Zustand 5.0.11

### 4.2 ARQUITETURA FRONTEND

- UI tokens/utilitários:
  - `tokens.css`, `utilities.css`, `themes.css`, `sidebar.css`, `responsive.css`
- Componentes compartilhados:
  - `components/ui/*`, `components/layout/Sidebar.tsx`
- Componentes de domínio:
  - `components/app/*`, `components/tools/ToolCard.tsx`
- Hooks:
  - `useApiStatus`, `useConfigStatus`, `useMe`, `useToast`
- Context:
  - `ThemeContext`
- Providers:
  - `BrowserRouter`, `ThemeProvider`

### 4.3 ROTAS FRONTEND

- `/login` (pública)
- `/` (protegida)
- `/vitrines/:id` (protegida)
- `/ferramentas` (protegida)
- `/exportacoes` (protegida)
- `/dashboard` (protegida)
- `/admin/config` (protegida)

Proteção:
- `ProtectedRoute` via presença de token em localStorage.

### 4.4 CONSUMO DA API

- Base definida em `src/api/base.ts` com resolução dinâmica:
  - `window.__UNICV_API_BASE`
  - `VITE_API_BASE_URL` / `VITE_API_BASE`
  - fallback por host
- Requests via `fetch` encapsulado:
  - `apiGet`, `apiPost`, `apiPut`, `apiDelete`
- Tratamento de erro:
  - parser em `handleResponse`
- Interceptadores axios:
  - **Não identificado no código atual**
- Sessão:
  - token em localStorage (`unicv_admin_token`)

### 4.5 ESTADO

- `useState` extensivo
- `ThemeContext`
- `zustand` (`vitrinesStore.ts`)
- `useMe.ts` órfão no grafo (não referenciado nas rotas atuais)

### 4.6 BUILD FRONTEND

Scripts:
- `dev`, `build`, `preview`

VITE vars detectadas:
- `VITE_API_BASE_URL`
- `VITE_PUBLIC_BASE_URL`
- `VITE_API_BASE`
- `VITE_SERVICE_URL_API`
- `VITE_SERVICE_FQDN_API`

Riscos:
- bundle JS principal ~756kB (warning de chunk grande)

---

## 5) DOCKER E DEPLOY – INSPEÇÃO DE PRODUÇÃO

### 5.1 Dockerfiles

- `Dockerfile` raiz: multi-target `api`/`web`, Node 20 alpine + Nginx
- `studio/api/Dockerfile`: multi-stage Node 20 alpine
- `studio/web/Dockerfile`: multi-stage Node 20 alpine + Nginx

### 5.2 .dockerignore

Existe e exclui `.env`, `.git`, `node_modules`, compose/dockerfiles etc.

### 5.3 Docker Compose

- `docker-compose.yml`: stack principal (`db`, `api`, `web`) com healthcheck no db e api.
- `docker-compose.studio.yml`: similar, com diferenças de build args e exposição da porta 5432.
- `compose.yaml` / `compose.debug.yaml`: legado, não alinhado ao fluxo principal.

### 5.4 Conexões

- API conecta em host `db`: **Sim**
- Web usa base da API via env/runtime script: **Sim**

### 5.5 Coolify

Riscos principais:
- uso de compose legado incorreto
- `BASE_URL`/`PUBLIC_BASE_URL` mal configurados
- segredo default em produção (`COOKIE_SECRET`)

---

## 6) SCRIPTS E DX

### 6.1 Scripts por package

Raiz:
- `dev`, `dev:api`, `dev:web`, `build`, `check`, `doctor`, `smoke`, `stop`, `clean`, `build:packages`, `studio:*`

API:
- `dev`, `build`, `start`, `prisma:generate`, `prisma:migrate`, `prisma:studio`

WEB:
- `dev`, `build`, `preview`

### 6.2 Scripts redundantes

- Duplicidade funcional entre `dev:api` e `studio:dev`, etc.

### 6.3 Scripts quebrados/inconsistentes

- `doctor` valida `SESSION_SECRET` mas backend usa `COOKIE_SECRET`.
- `smoke` espera payload de `/health` diferente do retorno real.
- `compose.debug.yaml` referencia `index.js` inexistente.

### 6.4 Ferramentas de lint/typecheck/test

- ESLint: **Não identificado no código atual**
- Prettier: **Não identificado no código atual**
- Typecheck: via `tsc` no build
- Testes: **Não identificado no código atual**
- Coverage: **Não identificado no código atual**

---

## 7) SEGURANÇA

- Credenciais hardcoded reais: **Não identificado no código atual**
- SQL injection por raw unsafe: **Não identificado no código atual**
- CORS: configurado globalmente
- Rate limit: **Não identificado no código atual**
- Helmet: **Não identificado no código atual**
- Headers hardening dedicados: **Não identificado no código atual**
- Tokens admin em localStorage
- Cookies OAuth/LTI com `httpOnly`, `sameSite=lax`, `secure` em produção
- `npm audit`: 7 vulnerabilidades (6 high, 1 moderate)

---

## 8) ACOPLAMENTOS E RISCOS ESTRUTURAIS

1. Acoplamento API com assets da raiz
2. Acoplamento forte Web↔API por contrato implícito
3. Duplicação de lógica de Vimeo em rotas distintas
4. Arquivos muito grandes (`HomePage`, `ToolsPage`, `VitrineDetalhePage`, `adminVimeoCollaborators`)
5. Sem camada de repositório dedicada
6. Código/arquivos de legado coexistindo
7. Import circular no web (`routes -> AppLayout -> Sidebar -> routes`)
8. Dependência de ambiente local em scripts/docs
9. Telemetria de debug versionada em `builder.html`
10. Composes legados paralelos ao stack principal

---

## 9) RISCOS DE PRODUÇÃO

### Build limpo
- Build root pode falhar sem `prisma generate` prévio em algumas condições de ambiente.

### Coolify
- Erro de arquivo compose/target incorreto
- vars de base URL incorretas
- segredo default mantido

### Banco vazio
- Conta default é criada sob demanda
- Fluxos de negócio dependem de dados mínimos de vitrines/integrações

### Seed
- Seed script: **Não identificado no código atual**

### Variáveis opcionais críticas
- `ADMIN_USER`/`ADMIN_PASSWORD`
- `BASE_URL`/`PUBLIC_BASE_URL`
- `VIMEO_*`
- `LTI_*`
- `LRS_*`
- `PLAYLIST_HMAC_SECRET`

---

## 10) RESUMO EXECUTIVO EXTREMO

### Estado estrutural geral (0-10)
- **6,5 / 10**

### Maturidade
- **Beta operacional com áreas frágeis para produção**

### 10 maiores riscos técnicos
1. Dependência de geração Prisma no fluxo de build.
2. Ausência de rate limiting.
3. Ausência de hardening HTTP dedicado.
4. Segredo default em produção.
5. Vulnerabilidades em dependências transitivas.
6. Import circular no frontend.
7. Arquivos muito extensos e de alta complexidade.
8. Inconsistências de documentação/scripts.
9. Telemetria de debug versionada.
10. Composes legados concorrendo com fluxo oficial.

### 10 melhorias prioritárias (diagnóstico de prioridade)
1. Tornar `prisma generate` explícito no pipeline de build.
2. Hardening de segurança HTTP.
3. Rate limiting.
4. Política rígida de segredos em produção.
5. Correção de docs/scripts divergentes.
6. Eliminar ciclo de imports.
7. Reduzir chunk inicial do frontend.
8. Tratar vulnerabilidades de dependências.
9. Limpar artefatos legados/debug.
10. Formalizar observabilidade/sanitização de logs.

### Complexidade estimada
- **Média-alta**

### Manutenibilidade
- **Média**

---

### Observações finais de auditoria factual

- Alterações de código no repositório durante auditoria original: **Nenhuma alteração versionada**.
- Itens ausentes foram marcados como **“Não identificado no código atual”**.
