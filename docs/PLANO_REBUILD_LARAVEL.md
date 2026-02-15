# Plano de Rebuild Completo — UniCV em Laravel (PHP)

Este documento descreve o plano de refatoração e rebuild do projeto **UniCV** (Player SCORM + Studio) do zero, com stack **Laravel (PHP)** para alinhamento com o ecossistema UniCV (Laravel) e manutenção unificada.

---

## 1. Estado atual (escopo analisado)

### 1.1 Visão geral

| Componente | Stack atual | Função |
|------------|-------------|--------|
| **Player** | HTML/JS estático (raiz) | Página única: player Vimeo + lista, progresso SCORM 1.2, temas |
| **Manifesto** | `imsmanifest.xml` | SCORM 1.2 para Moodle |
| **Studio API** | Node (Fastify + TypeScript + Prisma) | OAuth Vimeo, vitrines, playlist, export ZIP, LTI 1.3, xAPI |
| **Studio Web** | React (Vite) | Painel admin: vitrines, config (Vimeo/LTI/LRS), dashboard, exportações |
| **Build em lote** | Node (`build-packages.js` + CSV) | Gera vários pacotes SCORM a partir de `disciplinas.csv` |
| **Deploy** | Docker Compose (API + Web + Postgres) | `docker-compose.studio.yml` |

### 1.2 Modelo de dados (Prisma → a migrar)

- **Account** — workspace/conta (default único no MVP)
- **VimeoConnection** — OAuth (access/refresh token, expiresAt)
- **Vitrine** — playlist (título, descrição, `vimeoShowcaseId`, origem MANUAL | VIMEO_SHOWCASE)
- **Video** — metadados Vimeo (id, título, thumb, duration, embedHash)
- **VitrineVideo** — N:N vitrine–vídeo com `position`
- **ExportJob** — tipo (HTML | SCORM12 | IFRAME), status, artifactPath
- **LtiDeployment** — issuer, clientId, deploymentId, jwksKid, launchUrl
- **AppConfig** — key/value (config editável pela UI)
- **DashboardEvent** — eventos para métricas (tipo, source, payload)

### 1.3 Endpoints atuais (API Fastify)

| Área | Endpoints |
|------|-----------|
| Saúde | `GET /health` |
| Player | `GET /player/`, `GET /player/index.html`, assets (style.css, scorm.js, js/*, css/*) com config injetada |
| Playlist | `GET /v1/playlist?vitrine_id=|showcase_id=` → `{ videos: [...] }` |
| Vimeo | OAuth: `GET /auth/vimeo/start`, `GET /auth/vimeo/callback`; `GET /v1/vimeo/status`, `GET /v1/vimeo/showcases`, `POST /v1/vimeo/showcases/:id/import` |
| Vitrines | CRUD vitrines (API REST em `/v1/vitrines`) |
| Export | `POST /v1/exports` (HTML/SCORM/iframe), download do ZIP |
| Config | `GET /v1/config/status`, `GET /v1/config/env`, `PUT /v1/config/env` |
| LTI | `GET /lti/config`, `GET /lti/.well-known/jwks.json`, `GET /lti/login`, `POST /lti/launch` |
| xAPI | `POST /v1/xapi/statements` (proxy LRS) |
| Dashboard | `GET /v1/dashboard/summary`, `POST /v1/dashboard/events` |

### 1.4 Player (raiz)

- **index.html** — shell; config injetada via `/* __UNICV_CONFIG__ */` (SHOWCASE_ID ou VITRINE_ID, N8N_BASE, XAPI_URL).
- **js/** — config, state, api (fetch playlist), scorm-service, ui, player (Vimeo), theme, main.
- **style.css** + **css/** — temas e layout.
- **scorm.js** — API SCORM 1.2 (cmi.suspend_data, score, lesson_status, etc.).

O player continua **agnóstico de backend**: consome JSON de playlist e, no modo VPS, usa `N8N_BASE` como `/v1/playlist` e `VITRINE_ID`.

---

## 2. Objetivos do rebuild

1. **Unificar stack em PHP/Laravel** para integração natural com o resto do UniCV (Laravel).
2. **Manter compatibilidade** com Moodle (SCORM 1.2), LTI 1.3 e xAPI.
3. **Preservar comportamento** do Player (sem reescrever lógica em PHP; apenas servir assets e config).
4. **Substituir** Studio API (Fastify) por **Laravel** (rotas API + possivelmente Blade/Livewire para o painel).
5. **Migrar** dados e lógica de negócio (Prisma → Eloquent + migrations).
6. **Documentar** e deixar o projeto pronto para deploy (Docker, env, Laravel best practices).

---

## 3. Stack alvo

| Camada | Tecnologia |
|--------|------------|
| **Backend** | Laravel 11.x (PHP 8.2+) |
| **Banco** | PostgreSQL (igual ao atual) |
| **ORM** | Eloquent + migrations |
| **Auth (Studio)** | Sessions Laravel (e eventualmente integração com auth UniCV) |
| **API** | Rotas Laravel (API Resource, Form Requests) — mesma superfície REST |
| **Painel Studio** | Opção A: React (Vite) consumindo API Laravel (menor mudança). Opção B: Blade + Livewire + Alpine (100% Laravel). Recomendação inicial: **Opção A** para reduzir risco e prazo; migrar para B em fase posterior se desejado. |
| **Player** | Manter HTML/JS/CSS estáticos; Laravel serve `index.html` (view ou arquivo) com config injetada e assets (ou CDN). |
| **Export SCORM/HTML** | Comandos Artisan ou Jobs + PHP (ZipArchive, leitura de templates na pasta `player/`). |
| **LTI 1.3** | PHP (biblioteca LTI ou implementação mínima com JWT/jose). |
| **Vimeo OAuth** | Laravel Socialite (driver Vimeo) ou HTTP client Laravel. |
| **Deploy** | Docker: PHP-FPM + Nginx (ou Apache), Postgres, Node só se manter React para o painel (build estático). |

---

## 4. Estrutura de pastas proposta (Laravel)

```
unicv-studio/                    # Novo projeto Laravel (ou subpasta do repo)
├── app/
│   ├── Http/Controllers/
│   │   ├── Api/
│   │   │   ├── PlaylistController.php
│   │   │   ├── VitrineController.php
│   │   │   ├── VimeoController.php
│   │   │   ├── ExportController.php
│   │   │   ├── ConfigController.php
│   │   │   ├── DashboardController.php
│   │   │   └── XApiController.php
│   │   ├── LtiController.php
│   │   ├── AuthVimeoController.php
│   │   └── PlayerController.php      # serve index.html + assets com config
│   ├── Models/
│   │   ├── Account.php
│   │   ├── VimeoConnection.php
│   │   ├── Vitrine.php
│   │   ├── Video.php
│   │   ├── VitrineVideo.php
│   │   ├── ExportJob.php
│   │   ├── LtiDeployment.php
│   │   ├── AppConfig.php
│   │   └── DashboardEvent.php
│   ├── Services/
│   │   ├── VimeoService.php           # OAuth + API Vimeo
│   │   ├── LtiService.php             # JWT, JWKS, launch
│   │   ├── ScormExportService.php     # ZIP SCORM/HTML (templates em resources/player)
│   │   ├── AppConfigService.php
│   │   └── XApiProxyService.php
│   └── ...
├── config/
│   ├── unicv.php                     # base_url, vimeo, lti, lrs
│   └── ...
├── database/migrations/              # equivalentes ao Prisma
├── resources/
│   ├── player/                       # cópia controlada do player atual
│   │   ├── index.html.tpl            # template com placeholder config
│   │   ├── imsmanifest.xml.tpl
│   │   ├── style.css
│   │   ├── scorm.js
│   │   ├── css/
│   │   └── js/
│   └── views/                        # Blade do painel (se Opção B)
├── routes/
│   ├── api.php                       # /v1/playlist, /v1/vimeo/*, /v1/exports, etc.
│   ├── web.php                       # /player/*, /auth/vimeo/*, /lti/*, painel
│   └── ...
├── public/                           # entry point; assets do painel (React build ou Blade)
├── storage/app/exports/              # ZIPs gerados
├── .env.example
├── Dockerfile
└── docker-compose.yml
```

O **player atual** (raiz do repo atual) passa a ser a “fonte de verdade” em `resources/player/`: templates HTML/XML e assets. O build em lote (CSV) pode virar **Comando Artisan** `php artisan unicv:build-packages disciplinas.csv`.

---

## 5. Fases do rebuild

### Fase 0 — Preparação (1–2 dias)

- [ ] Criar novo projeto Laravel (ou branch dedicada) na pasta desejada.
- [ ] Configurar Postgres em `.env` e garantir compatibilidade com deploy atual.
- [ ] Definir se o painel será React (mantido) ou Blade/Livewire (documentar decisão no plano).

**Entregável:** Projeto Laravel base rodando com `php artisan serve` e conexão ao banco.

---

### Fase 1 — Modelo de dados e migrations (2–3 dias)

- [ ] Criar migrations para: accounts, vimeo_connections, vitrines, videos, vitrine_videos, export_jobs, lti_deployments, app_configs, dashboard_events.
- [ ] Criar models Eloquent com relações (espelhando Prisma).
- [ ] Seed mínimo: uma Account "default" (opcional).
- [ ] Documentar diferenças de naming (snake_case DB vs camelCase Prisma) se houver.

**Entregável:** `php artisan migrate` sobe o schema; models testáveis.

---

### Fase 2 — API core (playlist, player, health) (2–3 dias)

- [ ] **Health:** `GET /health` → JSON.
- [ ] **Playlist:** `GET /v1/playlist?vitrine_id=|showcase_id=` → mesmo JSON `{ videos }` (formato atual do player).
- [ ] **Player:** rotas que servem `index.html` com config injetada (VITRINE_ID / SHOWCASE_ID, N8N_BASE apontando para a própria API), e assets estáticos (style.css, scorm.js, js/*, css/*) a partir de `resources/player/` (ou `public/player/`).
- [ ] Config centralizada em `config/unicv.php` + env (BASE_URL, etc.).

**Entregável:** Player (HTML/JS) continua funcionando ao ser servido pelo Laravel; playlist consumida pelo player sem alterar `js/api.js` (apenas base URL se necessário).

---

### Fase 3 — Vimeo OAuth e vitrines (3–4 dias)

- [ ] Variáveis: `VIMEO_CLIENT_ID`, `VIMEO_CLIENT_SECRET`, `BASE_URL`, `VIMEO_REDIRECT_URI` (opcional).
- [ ] Rotas: `GET /auth/vimeo/start` (redirect para Vimeo), `GET /auth/vimeo/callback` (troca code por token, grava/atualiza VimeoConnection).
- [ ] Serviço Vimeo: token exchange, `GET /me`, listar showcases/albums, listar vídeos de um showcase, metadados (título, thumb, duration, embed hash).
- [ ] `GET /v1/vimeo/status` (conexão ativa ou não).
- [ ] `GET /v1/vimeo/showcases`, `POST /v1/vimeo/showcases/:id/import` (criar Vitrine + Videos + VitrineVideos com position).
- [ ] CRUD vitrines (listar, criar, editar, excluir) e ordem de vídeos na vitrine.

**Entregável:** Conexão Vimeo pelo painel; import de showcase; playlist por vitrine_id/showcase_id funcionando.

---

### Fase 4 — Export (SCORM 1.2, HTML, iframe) (2–3 dias)

- [ ] Serviço de export: ler templates de `resources/player/` (index.html, imsmanifest.xml), injetar config (apiBase, vitrineId, title), montar ZIP com ZipArchive (incluir assets quando “self-contained”).
- [ ] Endpoint `POST /v1/exports` (tipo: html | scorm12 | iframe; vitrine_id; título).
- [ ] Job assíncrono (opcional) para export pesado; ou síncrono com timeout adequado.
- [ ] Download do ZIP via `GET /v1/exports/:id/download` (ou link retornado no POST).
- [ ] Snippet iframe: mesmo formato que hoje (URL do player com `vitrine_id`).

**Entregável:** Exportação SCORM/HTML/iframe idêntica em resultado ao atual; arquivos em `storage/app/exports/`.

---

### Fase 5 — Configuração editável (AppConfig) (1 dia)

- [ ] Tabela `app_configs` (key, value); serviço que lê env primeiro e sobrescreve com DB (como hoje).
- [ ] `GET /v1/config/status` (vimeo, lti, lrs configured).
- [ ] `GET /v1/config/env` (lista de chaves com masked/label).
- [ ] `PUT /v1/config/env` (atualizar apenas chaves permitidas).

**Entregável:** Painel pode configurar variáveis pela UI; API usa config (env + DB).

---

### Fase 6 — LTI 1.3 (2–3 dias)

- [ ] Config: LTI_PLATFORM_ISSUER, CLIENT_ID, AUTH_LOGIN_URL, KEYSET_URL, DEPLOYMENT_ID; LTI_TOOL_PRIVATE_KEY_PEM, LTI_TOOL_KID.
- [ ] Gerar/carregar par de chaves (RSA); expor JWKS em `GET /lti/.well-known/jwks.json`.
- [ ] `GET /lti/config` (initiate_login_url, redirect_uris, jwks_url, launch_url) para configuração no Moodle.
- [ ] `GET /lti/login` (state, nonce, redirect para platform); `POST /lti/launch` (receber id_token, validar JWT com keyset da platform, extrair custom params vitrine_id/showcase_id, redirecionar para player com esse parâmetro).
- [ ] Armazenar deployment no banco (LtiDeployment) se necessário para multi-tenant futuro.

**Entregável:** Integração LTI 1.3 com Moodle funcional (launch → player com vitrine).

---

### Fase 7 — xAPI (LRS proxy) (1 dia)

- [ ] Config: LRS_ENDPOINT, LRS_BASIC_AUTH (ou env equivalente).
- [ ] `POST /v1/xapi/statements` → proxy para o LRS com autenticação; CORS se necessário.
- [ ] Player já envia para esse endpoint quando XAPI_URL está preenchido.

**Entregável:** Declarações xAPI do player chegando ao LRS via Laravel.

---

### Fase 8 — Dashboard (eventos e resumo) (1–2 dias)

- [ ] `POST /v1/dashboard/events` (type, source, payload) → gravar DashboardEvent.
- [ ] `GET /v1/dashboard/summary?days=` → totais, por tipo, por dia, últimos eventos (mesmo contrato que o painel React espera).

**Entregável:** Dashboard do painel com dados reais.

---

### Fase 9 — Painel (Studio Web) (3–5 dias)

- **Se Opção A (manter React):**
  - [ ] Apontar `VITE_API_BASE` (ou equivalente) para a URL da API Laravel.
  - [ ] Garantir CORS e cookies/session se necessário (mesmo domínio ou subdomínio recomendado).
  - [ ] Build do React em `public/studio` ou subdomínio; Laravel serve o index do SPA.
- **Se Opção B (Blade/Livewire):**
  - [ ] Reimplementar páginas do painel em Blade + Livewire (vitrines, config Vimeo/LTI/LRS, dashboard, export).
  - [ ] Reutilizar mesma API interna (controllers) ou lógica em Services chamada por Livewire.

**Entregável:** Painel acessível e funcional (login se necessário; por enquanto pode ser sem auth ou auth básico).

---

### Fase 10 — Build em lote (CSV) e CLI (1–2 dias)

- [ ] Comando Artisan: `php artisan unicv:build-packages disciplinas.csv [CDN_BASE]`.
- [ ] Lógica equivalente ao `build-packages.js`: parse CSV (disciplina, vimeo_id), para cada linha gerar ZIP SCORM com config (showcase_id ou vitrine_id conforme coluna), escrever em `storage/app/exports/` ou pasta configurável.
- [ ] Documentar formato do CSV e onde encontrar os ZIPs.

**Entregável:** Geração de vários pacotes SCORM a partir de CSV sem Node.

---

### Fase 11 — Deploy e documentação (2–3 dias)

- [ ] Dockerfile Laravel (PHP-FPM + Nginx ou Apache); docker-compose com app + Postgres (+ Node apenas se build React no CI).
- [ ] Variáveis de ambiente documentadas (`.env.example`).
- [ ] README atualizado: como rodar local, como fazer deploy, onde está a documentação do Player (DOCUMENTACAO.md) e do Studio (este plano e README do Laravel).
- [ ] Atualizar DOCUMENTACAO.md do player se a URL da playlist ou do player mudar (BASE_URL, rotas).

**Entregável:** Deploy reproduzível; documentação alinhada ao novo stack.

---

## 6. Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| LTI 1.3 em PHP (JWT, JWKS) | Usar biblioteca PHP (e.g. firebase/php-jwt ou web-token/jwt-library) ou pacote Laravel LTI; validar com cenário real Moodle cedo. |
| Diferença de comportamento na playlist ou no SCORM | Manter contrato exato (JSON playlist, campos SCORM); testes manuais no Moodle. |
| Regressão no player | Não alterar lógica do player; apenas trocar a origem dos assets e da config (Laravel serve os mesmos ficheiros). |
| Performance do export (ZIP grande) | Job em fila + notificação; ou timeout maior; evitar bloquear request. |

---

## 7. Ordem sugerida de execução

1. **Fase 0** → **Fase 1** → **Fase 2** (base + player + playlist).  
2. **Fase 3** (Vimeo + vitrines) para ter dados reais.  
3. **Fase 4** (export) para fechar o ciclo “vitrine → SCORM”.  
4. **Fase 5** (config) e **Fase 8** (dashboard) para o painel fazer sentido.  
5. **Fase 6** (LTI) e **Fase 7** (xAPI) para integrações.  
6. **Fase 9** (painel) e **Fase 10** (build CSV).  
7. **Fase 11** (deploy e docs).

---

## 8. Próximo passo imediato

- Confirmar decisão: **painel em React (Opção A)** ou **Blade/Livewire (Opção B)**.
- Iniciar **Fase 0**: criar projeto Laravel na estrutura desejada (novo repo ou pasta `laravel/` neste repo) e **Fase 1**: migrations + models.

Quando estiver de acordo, o próximo passo concreto é criar o projeto Laravel e as migrations (Fase 0 + Fase 1).
