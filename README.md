# Player UniCV

[![SCORM 1.2](https://img.shields.io/badge/SCORM-1.2-blue)](https://scorm.com/scorm-explained/) [![Moodle](https://img.shields.io/badge/Moodle-compatible-orange)](https://moodle.org/)

Player de videoaulas em estilo streaming (tipo Netflix) com rastreamento de progresso e temas claro/escuro, para uso no **Moodle** como atividade **SCORM 1.2**.

**Repositório:** [github.com/canhetejr/SCORM_UniCV_Ultimate_12094014](https://github.com/canhetejr/SCORM_UniCV_Ultimate_12094014)

## Funcionalidades

- **UX responsiva**: layout adaptável (player fixo no topo no mobile; no desktop, player à esquerda e lista à direita).
- **Persistência de progresso** via SCORM: o aluno pode sair e retornar; aulas marcadas como concluídas permanecem.
- **Nota no Moodle**: conclusão calculada como percentual de aulas concluídas (enviada em `cmi.core.score.raw` e `cmi.core.lesson_status`).
- **Tema claro/escuro** e **skeleton loading** na lista enquanto a playlist carrega.

## Estrutura do repositório

| Arquivo/Pasta      | Função |
|--------------------|--------|
| `imsmanifest.xml`  | Manifesto SCORM — entrada do Moodle; define o pacote e aponta para `index.html`. |
| `index.html`       | Página principal: player, cabeçalho, barra de progresso, lista de vídeos. |
| `style.css`        | Estilos, temas e skeleton. |
| `scorm.js`         | API SCORM 1.2: leitura/gravação de progresso e nota no LMS. |
| `js/`              | Módulos da aplicação: `config.js` (configuração e URLs), `state.js` (estado), `api.js` (fetch playlist), `scorm-service.js` (ponte SCORM), `ui.js` (DOM e eventos), `player.js` (Vimeo), `theme.js` (tema claro/escuro), `main.js` (orquestração/init). |
| `DOCUMENTACAO.md`  | Documentação interna (arquitetura e manutenção). |

## Como usar no Moodle

1. **Obter o pacote ZIP** (uma das opções):
   - **Opção A — Release (recomendado):** vá em [Releases](https://github.com/canhetejr/SCORM_UniCV_Ultimate_12094014/releases) e baixe o ficheiro `SCORM_UniCV_Ultimate_12094014.zip` anexado à release. Esse ZIP já está pronto para o Moodle.
   - **Opção B — Código fonte:** no GitHub, **Code → Download ZIP**. Extraia o ZIP e garanta que na **raiz** da pasta (ou do novo ZIP que for enviar ao Moodle) estejam `imsmanifest.xml`, `index.html`, `style.css`, `scorm.js` e a **pasta `js/`** com todos os módulos, sem pasta extra de nível superior na raiz.
2. No Moodle: adicione uma atividade **Pacote SCORM** e envie o ZIP.

O Moodle instalará o pacote e os alunos poderão acessar as videoaulas com progresso e nota integrados.

## Configuração da playlist

A vitrine de vídeos é definida em **`js/config.js`**, no objeto `UniCV.CONFIG`:

- **`SHOWCASE_ID`**: ID da vitrine (Showcase) do Vimeo.
- **`N8N_BASE`**: URL base do webhook (ex.: N8N) que devolve a lista de vídeos.
- **`N8N_URL`**: URL completa (construída automaticamente a partir de `N8N_BASE` + `?id=` + `SHOWCASE_ID`).

O backend deve devolver JSON no formato: `{ "videos": [ { "id", "name", "thumb", "duration" }, ... ] }`.  
Para detalhes de arquitetura e manutenção, consulte **[DOCUMENTACAO.md](DOCUMENTACAO.md)**.

## Repositório e publicação

O projeto está hospedado em [github.com/canhetejr/SCORM_UniCV_Ultimate_12094014](https://github.com/canhetejr/SCORM_UniCV_Ultimate_12094014). Em cada **Release** publicada, o GitHub Actions gera automaticamente um ZIP do pacote SCORM anexado à release (pronto para importar no Moodle).

### Ativar GitHub Pages (preview da interface)

1. No GitHub, abra o repositório e vá em **Settings**.
2. No menu lateral, clique em **Pages**.
3. Em **Source**, escolha **Deploy from a branch**.
4. Selecione a branch **main** e pasta **/ (root)**.
5. Salve. A página ficará disponível em:
   `https://canhetejr.github.io/SCORM_UniCV_Ultimate_12094014/`

> **Nota:** O GitHub Pages serve apenas para visualizar a interface. O rastreamento SCORM só funciona quando o pacote é carregado dentro do Moodle (upload do ZIP).

### CORS para GitHub Pages

A playlist é carregada via `fetch(CONFIG.N8N_URL)`. Se a página for servida em `github.io`, a origem é diferente da do webhook. Para a lista de vídeos aparecer no preview, o servidor (ex.: N8N) precisa enviar o cabeçalho `Access-Control-Allow-Origin` adequado (ex.: `*` ou `https://canhetejr.github.io`). Caso contrário, a lista pode não carregar na Page (no Moodle, dentro do LMS, CORS costuma não ser problema).

## Licença

Uso interno UniCV.
