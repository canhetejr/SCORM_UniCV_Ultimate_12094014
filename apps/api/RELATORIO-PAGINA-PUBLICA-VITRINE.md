# Relatório técnico — Página pública de vitrine (`/p/:slug`)

**Objetivo:** Preparar evolução de UX (layout moderno, busca, ordenação, SEO e melhorias visuais) sem quebrar contrato ou arquitetura.

**Escopo:** Apenas análise; nenhuma alteração de código ou refatoração.

---

## 1. Estrutura atual

### 1.1 Onde está o HTML da página pública?

| Item | Valor |
|------|--------|
| **Caminho completo do template** | `packages/player/index.html` |
| **Como é obtido** | O backend lê o arquivo do disco em tempo de resposta (não é servido estático para `/p/:slug`). |
| **Resolução do caminho** | `repoRoot` = diretório `packages/player` resolvido por `apps/api/src/lib/repoRoot.ts` (sobe a partir de `apps/api/src/lib` até encontrar `packages/player/index.html`). |

Trecho que define onde o HTML é lido:

```65:67:apps/api/src/modules/published/published.service.ts
  const template = fs.readFileSync(path.join(repoRoot, "index.html"), "utf8");
  const config = {
    VITRINE_ID: vitrine.id,
```

- **Tipo:** Template estático (arquivo HTML único) + substituição de placeholder no backend.
- **Não é:** HTML estático servido por CDN; não é renderização por framework (React/Vue) no servidor; não é gerado por outro pacote. O HTML vem exclusivamente de `packages/player/index.html`.

### 1.2 Como o backend injeta a config de vídeos?

Os vídeos **não** são injetados no HTML. O backend injeta apenas:

- `VITRINE_ID` (UUID da vitrine)
- `N8N_BASE`: `"/v1/playlist"`
- `N8N_API_TOKEN`: `""`

**Mecanismo de injeção:**

1. **Placeholder no template:** no `index.html` do player existe o comentário/script placeholder `/* __UNICV_CONFIG__ */`.
2. **Substituição no service:** o backend substitui esse texto por um script que define `window.UniCV_CONFIG`.

Trecho exato da injeção:

```66:74:apps/api/src/modules/published/published.service.ts
  const config = {
    VITRINE_ID: vitrine.id,
    N8N_BASE: "/v1/playlist",
    N8N_API_TOKEN: "",
  };
  let html = template.replace("/* __UNICV_CONFIG__ */", `window.UniCV_CONFIG=${JSON.stringify(config)};`);
  html = html.replace("<head>", "<head><base href=\"/player/\">");

  return { isNotFound: false, html };
```

**Placeholder no HTML (antes da substituição):**

```65:65:packages/player/index.html
    <script>/* __UNICV_CONFIG__ */</script>
```

**Resumo:**

- **Onde ocorre a injeção:** `apps/api/src/modules/published/published.service.ts`, função `getPage()`.
- **Arquivos envolvidos:**  
  - `packages/player/index.html` (template com placeholder);  
  - `apps/api/src/modules/published/published.service.ts` (leitura do template + replace);  
  - `apps/api/src/modules/published/published.routes.ts` (chama `getPage` e envia o HTML).

A lista de vídeos é obtida **no cliente**: o JavaScript do player chama `GET /v1/playlist?vitrine_id={VITRINE_ID}` (N8N_URL montada em `packages/player/js/config.js`). O endpoint **GET /p/:slug/config** existe e retorna `{ videos }` com o mesmo formato, mas **não é usado** pela página atual; a página usa apenas `vitrine_id` e `/v1/playlist`.

---

## 2. Player

### 2.1 Origem do player

- **Pacote:** `packages/player` (HTML + CSS + JS vanilla, sem bundler).
- **Reprodução de vídeo:** iframe com `src` apontando para `https://player.vimeo.com/video/{id}?...` (Vimeo embed). Não é script custom de player; é o player do Vimeo em iframe.

Trecho que define a URL do iframe:

```16:20:packages/player/js/player.js
    var src = "https://player.vimeo.com/video/" + videoId + "?autoplay=1&badge=0&autopause=0&dnt=1";
    if (v && typeof v.hash === "string" && v.hash) {
      src += "&h=" + encodeURIComponent(v.hash);
    }
    els.frame.src = src;
```

### 2.2 Como o vídeo é aberto?

- **Mesma página:** o iframe `#mainPlayer` já existe no DOM; ao clicar num item da playlist, o script apenas altera `els.frame.src` para a URL do Vimeo.
- **Não é:** nova aba, nova página nem modal. É substituição do `src` do iframe no mesmo layout (header com iframe + lista ao lado/abaixo).

Fluxo resumido: **clique no item da playlist → `UniCV.play(idx)` → atualização de `iframe.src` → overlay de boot some → vídeo toca.**

### 2.3 Suporte a eventos, conclusão, xAPI e controle externo

| Recurso | Suportado | Onde |
|--------|-----------|------|
| **xAPI** | Sim (opcional) | `CONFIG.XAPI_URL`; envio em `api.js` (`emitXapi`) para eventos como "experienced" e "completed". |
| **Callback de conclusão** | Sim (marcar aula concluída) | Botão "MARCAR CONCLUÍDA" em `main.js`; ao marcar, chama `emitXapi("completed", ...)` se XAPI_URL estiver definido. |
| **SCORM** | Sim | `scorm-service.js`: progresso, score, lesson location, suspend data; integrado ao mesmo fluxo de “concluída”. |
| **Controle externo** | Parcial | API exposta em `window.UniCV` (play, state, fetchPlaylist, etc.); não há documentação formal de API pública. |

O player **não** recebe eventos do iframe Vimeo (ex.: “vídeo terminou”); a conclusão é explícita pelo botão “MARCAR CONCLUÍDA”.

### 2.4 Fluxo completo: clique → exibição do vídeo

1. Utilizador abre `/p/:slug` → backend devolve HTML (template com `window.UniCV_CONFIG` e `<base href="/player/">`).
2. Browser carrega assets relativos a `/player/` (style.css, js/*.js, scorm.js).
3. `main.js` → `init()` → `UniCV.fetchPlaylist()` → `GET /v1/playlist?vitrine_id={VITRINE_ID}` → preenche `UniCV.state.videos`.
4. SCORM (se existir) é aguardado; progresso e lesson location são restaurados.
5. `renderPlaylist(UniCV.play)` monta a lista no DOM; cada item tem `click` → `onPlay(idx)`.
6. Primeira interação: overlay “INICIAR APRENDIZADO” chama `UniCV.play(startAt)`; em qualquer item, clique chama `UniCV.play(idx)`.
7. `player.js` → `play(idx)`:
   - Define `UniCV.state.activeIdx = idx`;
   - Monta URL Vimeo com `id` e opcionalmente `hash`;
   - Atribui `els.frame.src = src`;
   - Esconde overlay, atualiza título, barra de progresso e scroll para o item ativo.

---

## 3. Estrutura de assets

### 3.1 Onde estão CSS, JS e imagens?

Tudo fica em **`packages/player/`**:

| Tipo | Local | Observação |
|------|--------|------------|
| **HTML** | `packages/player/index.html` | Template único usado por `/p/:slug` e por `/player/index.html`. |
| **CSS** | `packages/player/style.css` + `packages/player/css/*.css` | `style.css` importa variables, base, layout, components, responsive. |
| **JS** | `packages/player/js/*.js` + `packages/player/scorm.js` | Carregados por `<script src="...">` na ordem definida no HTML. |
| **Imagens** | Não há pasta de imagens no player | Thumbnails vêm das URLs retornadas pela API (`thumb` por vídeo). |
| **Fontes** | Google Fonts (DM Sans) | Links no `<head>` do `index.html`. |

Para a **página `/p/:slug`**, o HTML devolvido inclui `<base href="/player/">`, então todos os recursos relativos (style.css, js/config.js, etc.) são pedidos ao **mesmo host** em `/player/style.css`, `/player/js/config.js`, etc., servidos pelas rotas do player na API.

### 3.2 Bundler

- **Não há** Vite, Webpack nem Rollup no `packages/player`.
- É **HTML + JS/CSS puro**: vários `<script src="...">` e um `<link rel="stylesheet" href="style.css">`; o `style.css` usa `@import` para os CSS modulares.

### 3.3 Estrutura da pasta do player e dependências

**Estrutura relevante em `packages/player/`:**

```
packages/player/
├── index.html
├── style.css
├── scorm.js
├── imsmanifest.xml
├── css/
│   ├── base.css
│   ├── components.css
│   ├── layout.css
│   ├── responsive.css
│   ├── variables.css
│   └── builder.css
└── js/
    ├── config.js
    ├── state.js
    ├── api.js
    ├── scorm-service.js
    ├── ui.js
    ├── player.js
    ├── theme.js
    ├── main.js
    └── builder.js
```

**Dependências de rede (runtime):**

- Google Fonts (fonts.googleapis.com, fonts.gstatic.com).
- Player Vimeo (player.vimeo.com) no iframe.
- API da própria aplicação (`/v1/playlist`, opcionalmente `/v1/xapi/statements`).

Não há `package.json` no player; não há dependências npm no pacote.

---

## 4. SEO atual

### 4.1 Elementos de SEO no `<head>` entregue

O HTML final de `/p/:slug` é o template com duas alterações:

1. `<head>` → `<head><base href="/player/">`
2. `/* __UNICV_CONFIG__ */` → `window.UniCV_CONFIG={...};`

**Conteúdo efetivo do `<head>` (após injeção):**

```html
<head>
  <base href="/player/">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>UniCV Play</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:..." rel="stylesheet">
  <link rel="stylesheet" href="style.css">
</head>
```

### 4.2 Resposta por pergunta

| Pergunta | Resposta |
|----------|----------|
| **`<title>` dinâmico?** | Não. Sempre "UniCV Play", independente do slug ou da vitrine. |
| **Meta description?** | Não existe. |
| **OpenGraph (og:title, og:description, og:image)?** | Não existe. |
| **JSON-LD?** | Não existe. |
| **Canonical?** | Não existe. |
| **Robots (noindex/follow, etc.)?** | Não existe. |

Ou seja: hoje não há SEO específico por vitrine; o `<head>` é genérico e fixo (exceto base e config injetados).

---

## 5. Performance

### 5.1 Carregamento de vídeos e lista

- **Lista de vídeos:** uma única chamada `GET /v1/playlist?vitrine_id=...` no init; todos os vídeos retornados são guardados em `UniCV.state.videos` e renderizados de uma vez em `renderPlaylist()`.
- **HTML:** não carrega “todos os vídeos” no HTML; carrega apenas o template + config mínima; a lista é construída no cliente após o fetch da playlist.

### 5.2 Lazy loading

- **Imagens (thumbnails):** em `ui.js`, ao criar o `<img>` do item, é definido `img.loading = "lazy"`. Portanto **há** lazy loading para as miniaturas.
- **Player (iframe Vimeo):** o iframe existe desde o carregamento; o `src` começa vazio e só é preenchido no primeiro play. Ou seja, o recurso pesado (vídeo) só é carregado quando o utilizador escolhe um vídeo. Não há lazy load do iframe em si (elemento já está no DOM).

### 5.3 Resumo

- Playlist: uma requisição, todos os itens renderizados de uma vez (sem paginação no cliente).
- Thumbnails: lazy loading.
- Vídeo: só carrega quando o utilizador clica para reproduzir.

---

## 6. Segurança

### 6.1 Validação do slug no backend

- **Rotas:** em `published.routes.ts`, o slug é lido e normalizado: `String((req.params as { slug?: string }).slug ?? "").trim()`.
- **Service:** `getPage` e `getConfig` usam esse valor apenas para buscar no repositório: `findVitrineBySlug(s)` / `findVitrineBySlugWithVideos(s)` com Prisma (`where: { slug }`). Não há concatenação em SQL nem em HTML; é query parametrizada.
- **Formato do slug:** não há validação de formato (ex.: apenas alfanumérico e hífens). Qualquer string após trim é usada como chave de busca. Se não existir, a vitrine não é encontrada e devolve-se 404 ou página “indisponível”.

### 6.2 Risco de XSS via dados da vitrine

- **No HTML servido:** os únicos dados dinâmicos injetados são `VITRINE_ID`, `N8N_BASE` e `N8N_API_TOKEN`, todos controlados pelo servidor e inseridos via `JSON.stringify(config)`. Não há inserção de título, descrição nem slug no HTML; portanto não há vetor de XSS no documento inicial.
- **No cliente (playlist):** os dados da playlist vêm de `GET /v1/playlist` (ou, em tese, de `GET /p/:slug/config`). Em `ui.js`, o nome do vídeo é atribuído com `h4.textContent = v.name` e a duração com `span.textContent = ...`. Uso de `textContent` evita XSS. As URLs de thumbnail são atribuídas a `img.src`; se o backend garantir que `thumbnailUrl` é URL segura (http/https), o risco fica limitado; não há sanitização explícita no frontend.
- **Conclusão:** não há uso de `innerHTML` com dados da vitrine/playlist nos pontos analisados; o risco de XSS por dados da vitrine no HTML da página ou na lista é baixo, desde que o backend não devolva conteúdo HTML em campos como título ou thumbnail.

### 6.3 Sanitização

- Não existe biblioteca de sanitização (ex.: DOMPurify) no player.
- A mitigação atual é o uso de `textContent` e de dados controlados pelo servidor na injeção do config.

---

## 7. Restrições técnicas

### 7.1 Limitações arquiteturais para evolução

- **Reestruturação visual:** não há limitação de contrato. O HTML/CSS/JS do player podem ser alterados (layout, componentes, temas) desde que:
  - O placeholder `/* __UNICV_CONFIG__ */` continue no HTML (ou o backend seja ajustado para outro mecanismo de injeção).
  - As rotas que servem o mesmo template (`/p/:slug` e `/player/index.html`) continuem a receber um HTML que dependa desse config e de `<base href="/player/">` (ou equivalente) para carregar assets.
- **Busca client-side:** possível. Os vídeos já estão em `UniCV.state.videos`; pode-se filtrar no cliente sem mudar backend. Se no futuro a lista for paginada no servidor, a busca pode exigir novo endpoint ou parâmetros.
- **Ordenação:** possível no cliente com o array atual; ordenação por critério novo (ex.: data, nome) pode ser feita em JS. Ordenação persistida exigiria backend (ex.: parâmetro de query ou reordenação na vitrine).
- **Filtros:** mesma ideia que busca/ordenação; filtros em cima de `state.videos` são viáveis sem alterar contrato da API.

### 7.2 Acoplamento com código antigo

- **Contrato estável:** o player espera `window.UniCV_CONFIG` com pelo menos `VITRINE_ID` (ou `SHOWCASE_ID`) e `N8N_BASE`; e espera que `UniCV.fetchPlaylist()` receba resposta no formato `{ videos: [ { id, name, thumb, duration, hash? } ] }`. Esse contrato é compartilhado por:
  - `/p/:slug` (published)
  - `/player/index.html?vitrine_id=...` (player routes)
  - LTI (redirect para `/player/index.html?vitrine_id=...`)
- **Código legado:** o player é JS vanilla com namespace `UniCV`; não há dependência de apps React (apps/web). A evolução de UX pode ser feita dentro do mesmo pacote (refatorando JS/CSS) ou com um novo bundle desde que mantenha o mesmo contrato de config e de resposta da playlist.

---

## 8. Contrato atual

### 8.1 Rotas confirmadas

| Rota | Método | Resposta | Observação |
|------|--------|----------|------------|
| **GET /p/:slug/config** | GET | `{ videos: Array<{ id, name, thumb, duration, hash? }> }` | Usado para obter a lista por slug; **não** utilizado pelo player atual (que usa `vitrine_id` + `/v1/playlist`). |
| **GET /p/:slug** | GET | HTML (página da vitrine ou “indisponível”) | Content-Type: text/html; 404 se slug vazio / vitrine inexistente / não ACTIVE. |

### 8.2 Outras dependências dessa estrutura

- **Frontend admin (apps/web):** apenas monta links para a URL pública via `buildPlayerUrl()` em `apps/web/src/lib/urls.ts` (ex.: `${publicBaseUrl}/p/${slug}`). Não consome HTML nem `/p/:slug/config`.
- **LTI:** redireciona para `/player/index.html?vitrine_id=...`, **não** para `/p/:slug`. Portanto LTI não depende da rota `/p/:slug`.
- **Exports (SCORM/ZIP):** em `exporter.service.ts` a URL embutida é `/player/index.html?vitrine_id=...`. Também não usa `/p/:slug`.

Conclusão: **nenhuma outra rota ou fluxo crítico depende da estrutura atual de `/p/:slug`** para além de “devolver HTML” e, opcionalmente, “devolver config em JSON”. A dependência é no formato do HTML (placeholder + base) e no contrato de config/playlist, não na URL em si.

---

## 9. Conclusão do relatório

### 9.1 É seguro evoluir apenas o frontend sem alterar o backend?

**Sim**, desde que:

- O HTML continuar a incluir o placeholder `/* __UNICV_CONFIG__ */` (ou o backend for alterado em conjunto para outro método de injeção).
- O `<base href="/player/">` (ou equivalente) continuar a permitir carregar os assets em `/player/`.
- O JavaScript continuar a esperar `window.UniCV_CONFIG` com `VITRINE_ID` e `N8N_BASE` e a consumir a resposta de `/v1/playlist` no formato atual `{ videos: [...] }`.

Mudanças puramente no layout, CSS, busca/ordenação/filtros no cliente e melhorias visuais não exigem mudança de API. Para **SEO por vitrine** (título, meta description, OpenGraph, etc.), será necessário que o **backend** injete esses dados no HTML (ex.: substituindo placeholders ou fragmentos no template), pois o título e as meta atuais são fixos.

### 9.2 Precisamos alterar o `published.service.ts`?

- **Para evolução só de layout/UX no cliente:** não.
- **Para SEO dinâmico (title, description, og:*, canonical, etc.):** sim; o service precisará receber título (e eventualmente descrição/imagem) da vitrine e injetá-los no HTML (novos placeholders ou substituição de trechos no template).

### 9.3 Precisamos alterar o repository?

- **Para manter o contrato atual:** não. `findVitrineBySlug` e `findVitrineBySlugWithVideos` já devolvem o necessário para a página e para o config.
- **Para SEO:** o service já tem acesso à vitrine em `getPage` (id, status); se o modelo Prisma já tiver título/descrição, não é obrigatório alterar o repository; apenas o service passaria a usar esses campos na geração do HTML. Se forem necessários campos novos (ex.: imagem de capa para og:image), aí sim pode ser preciso estender modelo e repository.

### 9.4 Risco de quebrar embed/LTI?

- **LTI:** redireciona para `/player/index.html?vitrine_id=...`, servido por `player.routes.ts`, que usa o **mesmo** template `packages/player/index.html` e o mesmo mecanismo de config (substituição de `/* __UNICV_CONFIG__ */`). Portanto:
  - Alterar apenas a **página** `/p/:slug` (por exemplo, servindo outro HTML só para essa rota) pode ser feito sem tocar no LTI.
  - Alterar o **template** ou o **contrato** do player (config, formato da playlist) afeta tanto `/p/:slug` quanto `/player/index.html` e, portanto, o LTI.
- **Embed:** se “embed” for o iframe Vimeo dentro da página, as alterações de layout/CSS/JS da página não quebram o embed; só importa manter o iframe e a forma como se passa `src`. Se houver algum embed externo que carregue `/p/:slug` em iframe, o que foi dito para “reestruturação visual” continua válido: pode evoluir desde que o contrato de config e de assets seja mantido.

**Resumo final:** É seguro evoluir a UX da página pública (layout, busca, ordenação, filtros, melhorias visuais) no frontend sem alterar backend, desde que se preserve o placeholder de config e o contrato da playlist. Para SEO dinâmico, é necessário alterar o `published.service.ts` (e eventualmente o template) para injetar título e meta por vitrine. Repository e LTI não precisam ser alterados para a evolução básica de UX; cuidado apenas ao mudar o template ou o contrato do player, pois isso afeta também o fluxo LTI que usa o mesmo player.
