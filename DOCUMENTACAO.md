# Player UniCV — Documentação de Arquitetura e Manutenção

Documentação técnica do **Player UniCV** (pacote SCORM na raiz do repositório). Para o Studio (API e painel), veja [studio/README.md](studio/README.md). Para deploy em produção, veja [studio/DEPLOY.md](studio/DEPLOY.md).

## Resumo do Projeto

| Campo | Valor |
|-------|--------|
| **Nome** | Player UniCV |
| **Objetivo** | Substituir a lista padrão de vídeos do Moodle por uma experiência de streaming moderna (tipo Netflix), com rastreamento de progresso real e suporte a temas. |
| **Pacote** | SCORM 1.2 (compatível com Moodle) |

---

## Funcionalidades Principais

- **UX imersiva**: Layout responsivo — player fixo no topo no celular; no desktop, player à esquerda e lista à direita.
- **Persistência**: Progresso salvo via SCORM (`cmi.suspend_data`). O aluno pode sair e retornar; aulas marcadas como concluídas permanecem.
- **Nota no Moodle**: Conclusão calculada como percentual (ex.: 5 de 10 aulas = 50%). Valores enviados em `cmi.core.score.raw` e `cmi.core.lesson_status`.
- **Acessibilidade**: Botão de Alto Contraste/Modo Escuro (tema claro/escuro) e suporte a legendas automáticas do Vimeo.
- **Skeleton loading**: Placeholders animados na lista enquanto os dados da vitrine são carregados.

---

## Arquitetura de Arquivos

```
SCORM_UniCV_Ultimate_12094014/
├── imsmanifest.xml   # Manifesto SCORM (recurso, organização)
├── index.html        # Página única: player + header + lista
├── style.css         # Estilos, temas e skeleton
├── scorm.js          # Ponte com a API SCORM do LMS (Moodle)
└── js/               # Módulos da aplicação
    ├── config.js          # Configuração (SHOWCASE_ID, N8N_URL, etc.)
    ├── state.js           # Estado global (playlist, progresso, activeIdx)
    ├── api.js             # Fetch da playlist (N8N webhook)
    ├── scorm-service.js   # Ponte SCORM (lê/grava cmi.*)
    ├── ui.js              # Manipulação do DOM e eventos
    ├── player.js          # Controlo do player Vimeo
    ├── theme.js           # Tema claro/escuro (localStorage)
    └── main.js            # Orquestração e inicialização
```

### Papel de cada arquivo

| Arquivo | Função |
|---------|--------|
| **imsmanifest.xml** | Define o pacote SCORM: título, item "Videoaulas", recurso que aponta para `index.html` e arquivos (HTML, JS, CSS). O Moodle usa isso para instalar o pacote. |
| **index.html** | Shell da aplicação: iframe do player Vimeo, overlay de "Iniciar", cabeçalho com título, barra de progresso, botões (anterior/próximo, marcar concluída, tema) e container da lista (`#videoList`). Carrega `scorm.js` e os scripts em **js/**. |
| **style.css** | Variáveis de tema (claro/escuro), layout do app-shell, player, lista, skeleton e estados (ativo, concluído). |
| **scorm.js** | Encontra a API do LMS (SCORM 1.2), inicializa, lê/grava `cmi.suspend_data`, `cmi.core.score.raw`, `cmi.core.lesson_status` e chama Commit/Finish. |
| **js/config.js** | Configuração centralizada: `SHOWCASE_ID`, `N8N_BASE`, `N8N_URL` (construído), timeouts, debounce, SVG de ícones. |
| **js/state.js** | Estado global da aplicação: array `playlist`, objeto `progress` (índice → concluído), `activeIdx` (vídeo atual). |
| **js/api.js** | Fetch da playlist via webhook N8N; retorna `{ videos: [...] }`. |
| **js/scorm-service.js** | Ponte com a API SCORM: aguarda inicialização, lê/grava `suspend_data`, `score`, `lesson_status`, `lesson_location`, faz commit e finish. |
| **js/ui.js** | Manipulação do DOM: renderiza lista, atualiza barra de progresso, texto de percentual, botões anterior/próximo, estado "concluída". |
| **js/player.js** | Controlo do player Vimeo: carrega vídeo, monta URL, esconde overlay, atualiza título. |
| **js/theme.js** | Tema claro/escuro: aplica classe no `body`, lê/grava em `localStorage` (`unicv_theme`). |
| **js/main.js** | Orquestração e inicialização: carrega playlist, aguarda SCORM, restaura progresso, liga eventos, inicia a aplicação. |

---

## Fluxo de Dados

1. **Carregamento**
   - `window.onload` em **js/main.js** chama **js/api.js** que faz fetch ao webhook N8N (URL em **js/config.js**) e recebe `{ videos: [...] }`.
   - Cada vídeo tem: `id`, `name`, `thumb`, `duration`.
   - Após aguardar a inicialização do SCORM (timeout configurável em **js/config.js**), **js/scorm-service.js** lê `cmi.suspend_data`, **js/state.js** restaura o objeto `progress` e **js/ui.js** renderiza a lista.

2. **Progresso**
   - `progress` (em **js/state.js**) é um objeto cuja chave é o índice do vídeo e o valor é `true` se a aula foi marcada concluída.
   - Função de sincronização (em **js/scorm-service.js** ou **js/ui.js**) calcula: `score = (número de concluídas / total) * 100`, atualiza a barra e o texto "X%" via **js/ui.js**, e grava em SCORM (`suspend_data`, `score.raw`, `lesson_status`) chamando **js/scorm-service.js**.

3. **Reprodução**
   - **js/player.js** define `activeIdx` em **js/state.js**, monta a URL do Vimeo com `autoplay=1`, atualiza o título, esconde o overlay e chama funções de **js/ui.js** para atualizar botões, estado "concluída", barra de progresso e sincronizar com SCORM.

4. **Tema**
   - **js/theme.js** aplica classe em `body`: `theme-dark` ou `theme-light`. Preferência salva em `localStorage` (`unicv_theme`) e aplicada no load.

---

## Configuração e Manutenção

### Trocar a vitrine de vídeos (playlist)

Em **js/config.js**, no objeto `UniCV.CONFIG`:

```javascript
global.UniCV.CONFIG = {
  SHOWCASE_ID: "12094014",
  N8N_BASE: "https://n8n.canhete.com.br/webhook/vimeo-playlist",
  // ...
};
```

- Altere `SHOWCASE_ID` para o ID da vitrine (Showcase) do Vimeo desejada.
- Se necessário, altere `N8N_BASE` para o URL base do webhook.
- O `N8N_URL` é construído automaticamente (`N8N_BASE + "?id=" + SHOWCASE_ID`).
- O webhook N8N deve devolver JSON no formato: `{ "videos": [ { "id", "name", "thumb", "duration" }, ... ] }`.
- A playlist também pode ser obtida pela **Studio API** (`GET /v1/playlist?showcase_id=...`), quando a vitrine estiver importada no banco; ver [studio/README.md](studio/README.md).

### Cores e tema

Em **style.css**, no bloco `:root`:

- `--primary`, `--primary-light`: verde principal.
- `--accent`: laranja (usado em hover, etc.).
- Cores de fundo, cartão, texto e borda vêm das variáveis; o tema escuro sobrescreve em `.theme-dark`.

Ajuste essas variáveis para manter consistência entre claro e escuro.

### SCORM (campos usados)

- **cmi.suspend_data**: JSON string do objeto `progress` (índice → true/false).
- **cmi.core.score.raw**: "0" a "100" (percentual de aulas concluídas).
- **cmi.core.lesson_status**: `"incomplete"` ou `"completed"` (100%).
- **cmi.core.lesson_location**: índice do último vídeo assistido (retomada).
- **cmi.core.entry**: `"ab-initio"` ou `"resume"` (indica se há progresso anterior).
- **cmi.core.session_time**: tempo de sessão em formato PT0H0M0S.

Se o Moodle usar outro padrão (ex.: SCORM 2004), será necessário adaptar os nomes dos campos em **scorm.js** e nas chamadas em **js/scorm-service.js**.

### CORS para GitHub Pages (webhook N8N)

Quando o player é servido via **GitHub Pages** (`https://<user>.github.io/...`), o navegador aplica CORS. O webhook N8N deve incluir na resposta o cabeçalho:

```
Access-Control-Allow-Origin: *
```

ou, para maior segurança (apenas o domínio do GitHub Pages):

```
Access-Control-Allow-Origin: https://<user>.github.io
```

**No N8N**, configure o nó **Respond to Webhook** ou o nó de resposta final para enviar esses cabeçalhos. Em workflows HTTP do N8N, adicione os headers na resposta:

- `Access-Control-Allow-Origin`: `*` ou `https://<user>.github.io`
- `Access-Control-Allow-Methods`: `GET, OPTIONS`
- `Access-Control-Allow-Headers`: `Content-Type`

Se usar um servidor proxy (nginx, Cloudflare, etc.) na frente do N8N, também é possível configurar os headers CORS lá. Sem esses cabeçalhos, o `fetch` da playlist falhará com erro de CORS quando a página for acessada via GitHub Pages.

### Skeleton

O skeleton está no **index.html** dentro de `#videoList` (div com classes `video-item skeleton-item`, etc.). Ao chamar `renderList()` em **js/ui.js**, o conteúdo de `#videoList` é substituído pela lista real; não é necessário alterar o HTML para manter o skeleton, apenas não remover a lógica de "carregando" antes do `fetch` concluir.

---

## Resumo para Manutenção

| O que fazer | Onde |
|-------------|------|
| Mudar playlist (vitrine) | **js/config.js**: `SHOWCASE_ID` e, se necessário, `N8N_BASE`. |
| Mudar cores/tema | **style.css**: variáveis em `:root` e `.theme-dark`. |
| Ajustar texto/rotulos | **index.html** (títulos, botões) e strings em **js/ui.js** ou **js/main.js**. |
| Compatibilizar com outro LMS/SCORM | **scorm.js** (nomes dos cmi.* e chamadas da API) e **js/scorm-service.js**. |
| Ajustar layout (mobile/desktop) | **style.css**: `.app-shell`, `.viewport-player`, `.content-scroll` e media query em `1024px`. |

---

*Documento gerado para apoio à arquitetura e manutenção do Player UniCV.*
