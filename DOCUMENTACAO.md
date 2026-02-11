# Player UniCV — Documentação de Arquitetura e Manutenção

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
├── script.js         # Lógica da aplicação (playlist, UI, progresso)
├── scorm.js          # Ponte com a API SCORM do LMS (Moodle)
└── style.css         # Estilos, temas e skeleton
```

### Papel de cada arquivo

| Arquivo | Função |
|---------|--------|
| **imsmanifest.xml** | Define o pacote SCORM: título, item “Videoaulas”, recurso que aponta para `index.html` e arquivos (HTML, JS, CSS). O Moodle usa isso para instalar o pacote. |
| **index.html** | Shell da aplicação: iframe do player Vimeo, overlay de “Iniciar”, cabeçalho com título, barra de progresso, botões (anterior/próximo, marcar concluída, tema) e container da lista (`#videoList`). Carrega `scorm.js` e `script.js`. |
| **script.js** | Carrega a playlist via webhook N8N, renderiza a lista, controla qual vídeo está em reprodução, marca conclusão, navega anterior/próximo, sincroniza progresso com SCORM e aplica tema (localStorage). |
| **scorm.js** | Encontra a API do LMS (SCORM 1.2), inicializa, lê/grava `cmi.suspend_data`, `cmi.core.score.raw`, `cmi.core.lesson_status` e chama Commit/Finish. |
| **style.css** | Variáveis de tema (claro/escuro), layout do app-shell, player, lista, skeleton e estados (ativo, concluído). |

---

## Fluxo de Dados

1. **Carregamento**
   - `window.onload` em `script.js` chama o webhook N8N com `SHOWCASE_ID` e recebe `{ videos: [...] }`.
   - Cada vídeo tem: `id`, `name`, `thumb`, `duration`.
   - Após ~800 ms (para dar tempo do SCORM inicializar), lê `cmi.suspend_data`, restaura o objeto `progress` e chama `renderList()`.

2. **Progresso**
   - `progress` é um objeto cuja chave é o índice do vídeo e o valor é `true` se a aula foi marcada concluída.
   - `sync()` calcula: `score = (número de concluídas / total) * 100`, atualiza a barra e o texto “X%”, grava em SCORM (`suspend_data`, `score.raw`, `lesson_status`) e chama `scorm.save()`.

3. **Reprodução**
   - `play(idx)` define `activeIdx`, monta a URL do Vimeo com `autoplay=1`, atualiza o título, esconde o overlay e chama `updateUI()` (botões, estado “concluída”, barra, sync).

4. **Tema**
   - Classe em `body`: `theme-dark` ou `theme-light`. Preferência salva em `localStorage` (`unicv_theme`) e aplicada no load.

---

## Configuração e Manutenção

### Trocar a vitrine de vídeos (playlist)

Em **script.js**, linhas 2–3:

```javascript
const SHOWCASE_ID = "12094014";
const N8N_URL = "https://n8n.canhete.com.br/webhook/vimeo-playlist?id=" + SHOWCASE_ID;
```

- Altere `SHOWCASE_ID` para o ID da vitrine (Showcase) do Vimeo desejada.
- O webhook N8N deve devolver JSON no formato: `{ "videos": [ { "id", "name", "thumb", "duration" }, ... ] }`.

### Cores e tema

Em **style.css**, no bloco `:root`:

- `--primary`, `--primary-light`: verde principal.
- `--accent`: laranja (usado em hover, etc.).
- Cores de fundo, cartão, texto e borda vêm das variáveis; o tema escuro sobrescreve em `.theme-dark`.

Ajuste essas variáveis para manter consistência entre claro e escuro.

### SCORM (campos usados)

- **cmi.suspend_data**: JSON string do objeto `progress` (índice → true/false).
- **cmi.core.score.raw**: “0” a “100” (percentual de aulas concluídas).
- **cmi.core.lesson_status**: `"incomplete"` ou `"completed"` (100%).
- **cmi.core.lesson_location**: índice do último vídeo assistido (retomada).
- **cmi.core.entry**: `"ab-initio"` ou `"resume"` (indica se há progresso anterior).
- **cmi.core.session_time**: tempo de sessão em formato PT0H0M0S.

Se o Moodle usar outro padrão (ex.: SCORM 2004), será necessário adaptar os nomes dos campos em **scorm.js** e nas chamadas em **script.js**.

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

O skeleton está no **index.html** dentro de `#videoList` (div com classes `video-item skeleton-item`, etc.). Ao chamar `renderList()` em **script.js**, o conteúdo de `#videoList` é substituído pela lista real; não é necessário alterar o HTML para manter o skeleton, apenas não remover a lógica de “carregando” antes do `fetch` concluir.

---

## Resumo para Manutenção

| O que fazer | Onde |
|-------------|------|
| Mudar playlist (vitrine) | `script.js`: `SHOWCASE_ID` e, se necessário, `N8N_URL`. |
| Mudar cores/tema | `style.css`: variáveis em `:root` e `.theme-dark`. |
| Ajustar texto/rotulos | `index.html` (títulos, botões) e strings em `script.js`. |
| Compatibilizar com outro LMS/SCORM | `scorm.js` (nomes dos cmi.* e chamadas da API). |
| Ajustar layout (mobile/desktop) | `style.css`: `.app-shell`, `.viewport-player`, `.content-scroll` e media query em `1024px`. |

---

*Documento gerado para apoio à arquitetura e manutenção do Player UniCV.*
