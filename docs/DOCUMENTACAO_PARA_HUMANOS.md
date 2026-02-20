# UniCV — Documentação para Humanos + Pacote para Rebuild (ChatGPT)

Documento técnico completo do projeto, sem alterações de código. Última varredura: fevereiro 2025.

---

## (1) MAPA DO REPO — Visão Geral

### O que esse sistema faz (linguagem simples)

O **UniCV** é um sistema para **publicar videoaulas em plataformas de ensino** (como Moodle). Ele oferece:

1. **Player** — Uma página que exibe uma lista de vídeos (tipo Netflix), com progresso, tema claro/escuro e integração SCORM para o Moodle.
2. **Studio** — Um painel onde o administrador conecta a conta Vimeo, cria ou importa vitrines (playlists de vídeos), e exporta pacotes SCORM/HTML/iframe para distribuir.
3. **Integrações** — LTI 1.3 (login via Moodle), xAPI (rastreamento de eventos) e exportação em ZIP para Moodle.

---

### Árvore de pastas (até 3 níveis, só o que importa)

```
SCORM_UniCV_Ultimate_12094014/
├── index.html              # Player principal (HTML)
├── imsmanifest.xml         # Manifesto SCORM (Moodle)
├── style.css               # Estilos do player
├── scorm.js                # Ponte com API SCORM do Moodle
├── .env.example            # Variáveis de ambiente (template)
├── tools/
│   └── build-packages.js   # Script SCORM em lote (node tools/build-packages.js <csv>)
├── packages/player/        # Player estático (index.html, css/, js/, style.css, scorm.js, imsmanifest.xml)
│   ├── css/
│   ├── base.css, components.css, layout.css, responsive.css, variables.css
├── js/                     # JavaScript do player ( vanilla )
│   ├── config.js           # Config (SHOWCASE_ID, VITRINE_ID, N8N_BASE...)
│   ├── state.js            # Estado global (playlist, progresso)
│   ├── api.js              # Fetch da playlist
│   ├── scorm-service.js    # Leitura/gravação SCORM
│   ├── ui.js               # DOM e eventos
│   ├── player.js           # Controle do iframe Vimeo
│   ├── theme.js            # Tema claro/escuro
│   └── main.js             # Inicialização
│
├── apps/
│   ├── api/                # Backend Node (Fastify + Prisma)
│   │   ├── src/
│   │   │   ├── index.ts    # Ponto de entrada
│   │   │   ├── server.ts   # Montagem do servidor e rotas
│   │   │   ├── env.ts      # Validação de variáveis (Zod)
│   │   │   ├── db.ts       # Cliente Prisma
│   │   │   ├── routes/     # Rotas por domínio
│   │   │   │   ├── health.ts, lti.ts, auth-vimeo.ts
│   │   │   │   ├── player.ts, playlist.ts, vitrines.ts
│   │   │   │   ├── vimeo.ts, exports.ts, config.ts
│   │   │   │   ├── xapi.ts, dashboard.ts, deps.ts
│   │   │   ├── services/
│   │   │   │   ├── vimeo.ts, lti.ts, exporter.ts, appConfig.ts
│   │   │   └── lib/
│   │   │       ├── repoRoot.ts, xml.ts
│   │   └── prisma/
│   │       └── schema.prisma  # Modelos: Account, Vitrine, Video, etc.
│   │
│   └── web/                # Painel React (Vite)
│       ├── src/ (main.tsx, App.tsx, api/, routes/, pages/, components/, etc.)
│       └── public/config.js
│
├── infra/docker/           # Dockerfile + docker-compose oficiais
└── docs/
    ├── README.md
    ├── DOCUMENTACAO_PARA_HUMANOS.md  # Este arquivo
    └── PLANO_REBUILD_LARAVEL.md
```

---

### Pontos de entrada

| Componente | Arquivo principal | Observação |
|------------|-------------------|------------|
| **Backend (Node)** | `apps/api/src/index.ts` | Chama `buildServer()` em `server.ts` |
| **Rotas da API** | `apps/api/src/server.ts` | Registra todos os route plugins |
| **Frontend (React)** | `apps/web/src/main.tsx` | Renderiza `<App />` com Router |
| **Páginas / rotas React** | `apps/web/src/routes/index.tsx` | /, /dashboard, /admin/config |
| **Player (HTML/JS)** | `index.html` + `js/main.js` | Carrega config injetada e módulos em `js/` |
| **Como o player é servido** | `apps/api/src/routes/player.ts` | Rota `/player/index.html` (prefixo `/player`) |
| **Infra** | `docker-compose.studio.yml` | Serviços: db (Postgres), api (Node), web (nginx) |

---

### Onde procurar cada coisa

| O quê | Onde |
|-------|------|
| Rotas HTTP da API | `apps/api/src/routes/*.ts` e `apps/api/src/server.ts` |
| Modelos do banco | `apps/api/prisma/schema.prisma` |
| Chamadas de API no React | `apps/web/src/api/index.ts` e páginas em `apps/web/src/pages/` |
| Config do player | `js/config.js` + `window.UniCV_CONFIG` (injetado no HTML) |
| Fetch da playlist | `js/api.js` → `UniCV.fetchPlaylist()` |
| Export SCORM/HTML | `apps/api/src/services/exporter.ts` + `apps/api/src/routes/exports.ts` |

### Autenticação Admin (proteção das rotas de gestão)

- **Rotas públicas (sem login):** `/health`, `/lti/*`, `/player/*`, `/v1/playlist`, `/v1/config/status`, `/v1/xapi/*`, `/auth/vimeo/callback`, `POST /v1/admin/login`.
- **Rotas admin (exigem token JWT):** `/auth/vimeo/start`, `/v1/vimeo/*`, `/v1/config/env`, `/v1/vitrines/*`, `/v1/exports/*`, `/v1/dashboard/*`.
- **Credenciais:** definidas no .env do servidor: `ADMIN_USER` e `ADMIN_PASSWORD`. Login: `POST /v1/admin/login` com `{ "username", "password" }`; resposta `{ "token" }`. O frontend guarda o token em `localStorage` e envia no header `Authorization: Bearer <token>` em todas as chamadas. Ver `.env.example` e testes em (5)–(7) abaixo.

---

## (2) COMO O SISTEMA FUNCIONA — Fluxos

---

### Fluxo A: Admin cria/edita Vitrine (Showcase)

**Resumo:** O admin usa o painel React para criar vitrines manuais ou importar showcases do Vimeo.

**Passos principais:**

1. **Conectar Vimeo**  
   - `GET /auth/vimeo/start` → redireciona para OAuth Vimeo  
   - `GET /auth/vimeo/callback` → troca code por token, salva em `VimeoConnection`  
   - Arquivos: `apps/api/src/routes/auth-vimeo.ts`, `apps/api/src/services/vimeo.ts`

2. **Ou conectar com token (testes)**  
   - `POST /v1/vimeo/connect-token` body: `{ accessToken }`  
   - Arquivo: `apps/api/src/routes/vimeo.ts`

3. **Listar showcases do Vimeo**  
   - `GET /v1/vimeo/showcases` ou `?userId=xxx`  
   - Handler: `vimeo.ts` → `vimeoGet` em `/me/albums` ou `/users/{id}/albums`

4. **Importar showcase do Vimeo**  
   - `POST /v1/vimeo/showcases/:id/import` body: `{ vimeoUserId? }`  
   - Cria/atualiza `Vitrine` com `vimeoShowcaseId` e `vimeoSource: VIMEO_SHOWCASE`  
   - Arquivo: `apps/api/src/routes/vimeo.ts`

5. **Criar vitrine manual**  
   - `POST /v1/vitrines` body: `{ title, description? }`  
   - Arquivo: `apps/api/src/routes/vitrines.ts`

6. **Adicionar vídeo à vitrine**  
   - `POST /v1/vitrines/:id/videos` body: `{ vimeoVideoId | url, title?, embedHash? }`  
   - Arquivo: `apps/api/src/routes/vitrines.ts`

7. **Importar vídeos via CSV**  
   - `POST /v1/vitrines/:id/import/csv` body: CSV (text/plain)  
   - Colunas: `vimeo_video_id` ou `url`, `title`, `embed_hash`

**Dados no banco:**

- `Account` — conta padrão (cuid)
- `VimeoConnection` — accessToken, refreshToken, vimeoUserId
- `Vitrine` — title, vimeoShowcaseId (se importado), vimeoSource
- `Video` — vimeoVideoId, title, thumbnailUrl, durationSec, embedHash
- `VitrineVideo` — liga vitrine ↔ vídeo com `position`

**Riscos/bugs prováveis:**  
- OAuth depende de cookie `vimeo_oauth_state`; em produção `secure: true` exige HTTPS.  
- Não há refresh automático do token Vimeo; se expirar, a importação falha.  
- Vitrines importadas têm ID `vimeo_showcase_{id}`; vitrines manuais têm ID gerado (cuid).

---

### Fluxo B: Sistema pega playlist / vídeos (Vimeo ou banco)

**Resumo:** O player ou o export buscam a playlist via `GET /v1/playlist`.

**Passos principais:**

1. **Chamada**  
   - `GET /v1/playlist?vitrine_id=xxx` ou `?showcase_id=yyy` ou `?id=yyy`  
   - Arquivo: `apps/api/src/routes/playlist.ts`

2. **Resolução da vitrine**  
   - Se `vitrine_id`: busca por `Vitrine.id`  
   - Se `showcase_id` ou `id`: busca por `vimeoShowcaseId` ou `id = vimeo_showcase_{id}`

3. **Resposta**  
   - JSON: `{ videos: [ { id, name, thumb, duration, hash? }, ... ] }`  
   - Campos vêm de `Video` + `VitrineVideo` ordenados por `position`

**Dados envolvidos:** `Vitrine`, `VitrineVideo`, `Video`.

**Riscos/bugs prováveis:**  
- Vitrine inexistente retorna 404.  
- Sem autenticação; qualquer um com o ID pode consumir a playlist (link público).

---

### Fluxo C: Player público abre e consome config/playlist

**Resumo:** O usuário abre o player (no Moodle, via iframe ou export) e vê os vídeos.

**Passos principais:**

1. **Acesso ao player**  
   - Via API: `GET /player/index.html?vitrine_id=xxx` ou `?showcase_id=yyy`  
   - Via arquivo estático (ex.: GitHub Pages): `index.html` com `SHOWCASE_ID` no `js/config.js`

2. **Injeção de config**  
   - `apps/api/src/routes/player.ts` lê `index.html`, substitui `/* __UNICV_CONFIG__ */` por:  
     `window.UniCV_CONFIG = { VITRINE_ID, N8N_BASE: "/v1/playlist", ... }`  
   - Ou `{ SHOWCASE_ID, N8N_BASE: "/v1/playlist", ... }`

3. **Montagem da URL da playlist**  
   - `js/config.js`: se `VITRINE_ID` existe, `N8N_URL = N8N_BASE + "?vitrine_id=" + VITRINE_ID`  
   - Caso contrário: `N8N_URL = N8N_BASE + "?id=" + SHOWCASE_ID`

4. **Fetch da playlist**  
   - `js/api.js` → `fetch(CONFIG.N8N_URL)`  
   - Quando servido pela API: `/v1/playlist?vitrine_id=...` (mesma origem)  
   - Quando standalone (n8n): `N8N_BASE` aponta para webhook externo

5. **Renderização e reprodução**  
   - `js/main.js` → orquestra init, `js/ui.js` renderiza lista, `js/player.js` controla iframe Vimeo  
   - `js/scorm-service.js` grava progresso no Moodle (SCORM 1.2)

**Arquivos principais:**

- `index.html`, `js/config.js`, `js/api.js`, `js/main.js`, `apps/api/src/routes/player.ts`

**Riscos/bugs prováveis:**  
- Player standalone depende de N8N ou outra fonte; se N8N cair, playlist não carrega.  
- CORS: o webhook N8N precisa enviar `Access-Control-Allow-Origin` adequado.

---

### Fluxo D: Export (SCORM/ZIP) é gerado e baixado

**Resumo:** O admin escolhe uma vitrine e gera ZIP SCORM ou HTML.

**Passos principais:**

1. **Solicitar export**  
   - `POST /v1/exports/scorm12` ou `POST /v1/exports/html`  
   - Body: `{ vitrineId, title, selfContained? }`  
   - Arquivo: `apps/api/src/routes/exports.ts`

2. **Geração do ZIP**  
   - `apps/api/src/services/exporter.ts`  
   - Lê `index.html` e `imsmanifest.xml` da raiz do repo  
   - Injeta config: `VITRINE_ID`, `N8N_BASE: {BASE_URL}/v1/playlist`, `XAPI_URL`  
   - Se `selfContained: true`: inclui `style.css`, `scorm.js`, `css/`, `js/` no ZIP  
   - Salva em `EXPORT_DIR` (ex.: `var/exports/`)

3. **Download**  
   - `GET /v1/exports/:id/download`  
   - Verifica que o job pertence à conta e que `status === SUCCEEDED`  
   - Envia o arquivo ZIP em stream

4. **Snippet iframe**  
   - `POST /v1/exports/iframe` body: `{ vitrineId }`  
   - Retorna HTML do iframe apontando para `{BASE_URL}/player/index.html?vitrine_id=...`

**Dados no banco:**  
- `ExportJob` — type (SCORM12, HTML, IFRAME), status, artifactPath, errorMessage

**Riscos/bugs prováveis:**  
- `BASE_URL` é obrigatório; se vazio, export falha.  
- Pacote exportado depende da API online (config aponta para `BASE_URL/v1/playlist`).  
- Se `selfContained: false`, o ZIP não inclui assets (CSS/JS); uso com CDN não está documentado no código.

---

## (3) PACOTE “PARA ENVIAR AO CHATGPT” — Resumo Técnico

### Stack atual

- **Backend:** Node.js + Fastify 5 + TypeScript  
- **ORM:** Prisma 6 + PostgreSQL  
- **Frontend:** React 19 + Vite 6 + React Router 7  
- **Player:** HTML + CSS + JS vanilla (sem framework)  
- **SCORM:** 1.2 (cmi.suspend_data, cmi.core.score.raw, lesson_status)  
- **Fila:** não existe (export é síncrono)  
- **Storage:** arquivos em disco (`EXPORT_DIR`)

---

### Como rodar localmente

```bash
# Instalar dependências
npm install

# Banco (Postgres) — use Docker ou local
# DATABASE_URL deve apontar para um Postgres

# Gerar cliente Prisma e rodar migrações
npm --workspace apps/api run prisma:generate
npm --workspace apps/api run prisma:migrate

# API (porta 3001)
npm run studio:dev

# Painel web (porta 3000)
npm run studio:web:dev

# Tudo com Docker
docker compose -f docker-compose.studio.yml up -d
```

---

### Variáveis .env

| Nome | Descrição |
|------|-----------|
| `DATABASE_URL` | URL do Postgres (obrigatório) |
| `BASE_URL` | URL pública da API (ex.: https://api.seudominio.com) |
| `VIMEO_CLIENT_ID` | App Vimeo (developer.vimeo.com/apps) |
| `VIMEO_CLIENT_SECRET` | Segredo do app Vimeo |
| `VIMEO_REDIRECT_URI` | Callback OAuth (opcional; default: BASE_URL/auth/vimeo/callback) |
| `COOKIE_SECRET` | Segredo para cookies (mín. 16 caracteres) |
| `EXPORT_DIR` | Pasta para ZIPs (default: var/exports) |
| `LTI_PLATFORM_ISSUER` | Issuer do Moodle (LTI 1.3) |
| `LTI_PLATFORM_CLIENT_ID` | Client ID do Moodle |
| `LTI_PLATFORM_AUTH_LOGIN_URL` | URL de login LTI |
| `LTI_PLATFORM_KEYSET_URL` | URL do JWKS do Moodle |
| `LTI_PLATFORM_DEPLOYMENT_ID` | Deployment ID |
| `LTI_TOOL_PRIVATE_KEY_PEM` | Chave privada PEM do tool |
| `LTI_TOOL_KID` | Key ID (default: unicv-tool-1) |
| `LRS_ENDPOINT` | Endpoint xAPI/LRS |
| `LRS_BASIC_AUTH` | user:pass ou base64 |

---

### Rotas principais

**Públicas (sem auth):**

- `GET /health` — health check  
- `GET /v1/playlist?vitrine_id=|showcase_id=|id=` — playlist JSON  
- `GET /player/index.html?vitrine_id=|showcase_id=` — player com config injetada  
- `GET /lti/.well-known/jwks.json` — JWKS para LTI  
- `GET /lti/config` — config do tool para Moodle  
- `GET /lti/login` — inicia fluxo LTI  
- `POST /lti/launch` — callback LTI  

**Admin / gerenciamento (sem auth explícito; CORS aberto):**

- `GET /auth/vimeo/start` — inicia OAuth Vimeo  
- `GET /auth/vimeo/callback` — callback OAuth  
- `GET /v1/vimeo/status`  
- `POST /v1/vimeo/connect-token`  
- `GET /v1/vimeo/showcases`  
- `POST /v1/vimeo/showcases/:id/import`  
- `POST /v1/vimeo/showcases/import-batch`  
- `POST /v1/vimeo/disconnect`  
- `GET /v1/vitrines`, `POST /v1/vitrines`  
- `GET /v1/vitrines/:id`  
- `POST /v1/vitrines/:id/videos`  
- `POST /v1/vitrines/:id/import/csv`  
- `POST /v1/exports/scorm12`, `POST /v1/exports/html`  
- `POST /v1/exports/iframe`  
- `GET /v1/exports/:id/download`  
- `GET /v1/config/status`, `GET /v1/config/env`, `PUT /v1/config/env`  
- `GET /v1/dashboard/summary`, `POST /v1/dashboard/events`  
- `POST /v1/xapi/statements` (proxy para LRS)  

**Observação:** Não há autenticação/autorização nas rotas admin; qualquer cliente com acesso à API pode chamá-las.

---

### Contrato do JSON de playlist

Exemplo de resposta de `GET /v1/playlist?vitrine_id=xxx`:

```json
{
  "videos": [
    {
      "id": "123456789",
      "name": "Aula 01 - Introdução",
      "thumb": "https://i.vimeocdn.com/...",
      "duration": 300,
      "hash": "abc123def"
    }
  ]
}
```

- `id` — ID do vídeo no Vimeo  
- `name` — título  
- `thumb` — URL da thumbnail  
- `duration` — duração em segundos  
- `hash` — hash do embed (opcional, para vídeos privados)

---

### Integrações

- **Vimeo:** OAuth 2.0 (authorization code), API REST para albums/showcases e vídeos  
- **Moodle/LTI:** LTI 1.3 — login, launch, custom params `vitrine_id` ou `showcase_id`  
- **SCORM:** 1.2, imsmanifest.xml, index.html com API SCORM  
- **xAPI:** Proxy em `POST /v1/xapi/statements` para LRS externo  
- **Storage:** Arquivos locais (EXPORT_DIR); sem S3 ou cloud storage

---

### Segurança

- **Cookies:** OAuth e LTI usam cookies `vimeo_oauth_state`, `lti_state`, `lti_nonce` (httpOnly, signed)  
- **Tokens:** Access token Vimeo e chave LTI ficam no servidor (.env ou AppConfig)  
- **Links públicos:** Playlist e player são públicos; qualquer um com `vitrine_id` ou `showcase_id` acessa  
- **Admin:** Rotas de vitrines/exports/config não têm login; dependem de rede/firewall

---

### O que está faltando / pendente

- Autenticação no painel admin  
- Refresh automático do token Vimeo  
- Modo “selfContained: false” com CDN documentado  
- n8n: NÃO ENCONTRADO no repo (webhook externo; apenas referência neste doc)  
- nginx.conf customizado: NÃO ENCONTRADO (web Docker usa nginx:alpine padrão)  
- Fila para exports assíncronos  
- Testes automatizados

---

## ARQUIVOS — Árvore completa (excl. node_modules, .git)

```
.dockerignore
.editorconfig
.env.example
build-packages.js
builder.html
disciplinas.csv
docker-compose.studio.yml
docs/DOCUMENTACAO_PARA_HUMANOS.md
imsmanifest.xml
index.html
LICENSE
package-lock.json
package.json
README.md
scorm.js
script.js
style.css
.cursor/agents/laravel-senior-engineer.md
.cursor/agents/wsl-executor.md
css/base.css
css/builder.css
css/components.css
css/layout.css
css/responsive.css
css/variables.css
docs/PLANO_REBUILD_LARAVEL.md
docs/README.md
js/api.js
js/builder.js
js/config.js
js/main.js
js/player.js
js/scorm-service.js
js/state.js
js/theme.js
js/ui.js
scripts/limpa-e-sobe.sh
docs/DEPLOY.md
docs/Studio.md
apps/api/Dockerfile
apps/api/package.json
apps/api/tsconfig.json
apps/api/prisma/schema.prisma
apps/api/prisma/migrations/migration_lock.toml
apps/api/prisma/migrations/20260213141753_add_app_config/migration.sql
apps/api/prisma/migrations/20260213180000_add_dashboard_events/migration.sql
apps/api/src/db.ts
apps/api/src/env.ts
apps/api/src/index.ts
apps/api/src/server.ts
apps/api/src/lib/repoRoot.ts
apps/api/src/lib/xml.ts
apps/api/src/routes/auth-vimeo.ts
apps/api/src/routes/config.ts
apps/api/src/routes/dashboard.ts
apps/api/src/routes/deps.ts
apps/api/src/routes/exports.ts
apps/api/src/routes/health.ts
apps/api/src/routes/lti.ts
apps/api/src/routes/player.ts
apps/api/src/routes/playlist.ts
apps/api/src/routes/vimeo.ts
apps/api/src/routes/vitrines.ts
apps/api/src/routes/xapi.ts
apps/api/src/services/appConfig.ts
apps/api/src/services/exporter.ts
apps/api/src/services/lti.ts
apps/api/src/services/vimeo.ts
apps/web/Dockerfile
apps/web/index.html
apps/web/package.json
apps/web/tsconfig.json
apps/web/vite.config.ts
apps/web/public/config.js
apps/web/src/App.tsx
apps/web/src/main.tsx
apps/web/src/api/index.ts
apps/web/src/components/ui/Button.tsx
apps/web/src/components/ui/Card.tsx
apps/web/src/components/ui/Field.tsx
apps/web/src/components/ui/index.ts
apps/web/src/components/ui/Input.tsx
apps/web/src/contexts/ThemeContext.tsx
apps/web/src/hooks/useConfigStatus.ts
apps/web/src/layouts/AppLayout.tsx
apps/web/src/pages/admin/config/configModules.ts
apps/web/src/pages/admin/config/ConfigPage.tsx
apps/web/src/pages/admin/config/sections/ConfigEnv.tsx
apps/web/src/pages/admin/config/sections/ConfigLrs.tsx
apps/web/src/pages/admin/config/sections/ConfigLti.tsx
apps/web/src/pages/admin/config/sections/ConfigVimeo.tsx
apps/web/src/pages/dashboard/DashboardPage.tsx
apps/web/src/pages/home/HomePage.tsx
apps/web/src/routes/index.tsx
apps/web/src/styles/themes.css
apps/web/src/types/config.ts
apps/web/src/types/vitrine.ts
```
