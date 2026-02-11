# Player UniCV

Player de videoaulas em estilo streaming (tipo Netflix) com rastreamento de progresso e temas claro/escuro, para uso no **Moodle** como atividade **SCORM 1.2**.

## Funcionalidades

- **UX responsiva**: layout adaptável (player fixo no topo no mobile; no desktop, player à esquerda e lista à direita).
- **Persistência de progresso** via SCORM: o aluno pode sair e retornar; aulas marcadas como concluídas permanecem.
- **Nota no Moodle**: conclusão calculada como percentual de aulas concluídas (enviada em `cmi.core.score.raw` e `cmi.core.lesson_status`).
- **Tema claro/escuro** e **skeleton loading** na lista enquanto a playlist carrega.

## Estrutura do repositório

| Arquivo            | Função |
|--------------------|--------|
| `imsmanifest.xml`  | Manifesto SCORM — entrada do Moodle; define o pacote e aponta para `index.html`. |
| `index.html`       | Página principal: player, cabeçalho, barra de progresso, lista de vídeos. |
| `script.js`        | Lógica da aplicação: playlist, UI, progresso e sincronização com SCORM. |
| `scorm.js`         | API SCORM 1.2: leitura/gravação de progresso e nota no LMS. |
| `style.css`        | Estilos, temas e skeleton. |
| `DOCUMENTACAO.md`  | Documentação interna (arquitetura e manutenção). |

## Como usar no Moodle

1. Faça o **download do repositório como ZIP** (no GitHub: Code → Download ZIP) ou use uma [Release](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository) se tiver criado uma.
2. Garanta que na **raiz do ZIP** estejam `imsmanifest.xml`, `index.html` e os demais arquivos (sem pasta extra na raiz).
3. No Moodle: adicione uma atividade **Pacote SCORM** e envie esse ZIP.

O Moodle instalará o pacote e os alunos poderão acessar as videoaulas com progresso e nota integrados.

## Configuração da playlist

A vitrine de vídeos é definida em **`script.js`**:

- **`CONFIG.SHOWCASE_ID`**: ID da vitrine (Showcase) do Vimeo.
- **`CONFIG.N8N_BASE`** / **`CONFIG.N8N_URL`**: URL do webhook (ex.: N8N) que devolve a lista de vídeos.

O backend deve devolver JSON no formato: `{ "videos": [ { "id", "name", "thumb", "duration" }, ... ] }`.  
Para detalhes de arquitetura e manutenção, consulte **[DOCUMENTACAO.md](DOCUMENTACAO.md)**.

## Publicar no GitHub

### 1. Inicializar repositório e enviar para o GitHub

```bash
git init
git add .
git commit -m "Initial commit - Player UniCV SCORM 1.2"
git branch -M main
git remote add origin https://github.com/<seu-usuario>/SCORM_UniCV_Ultimate_12094014.git
git push -u origin main
```

Substitua `<seu-usuario>` pelo seu nome de usuário do GitHub. Se o repositório ainda não existir, crie-o em [github.com/new](https://github.com/new) antes do push.

### 2. Ativar GitHub Pages (preview da interface)

1. No GitHub, abra o repositório e vá em **Settings**.
2. No menu lateral, clique em **Pages**.
3. Em **Source**, escolha **Deploy from a branch**.
4. Selecione a branch **main** e pasta **/ (root)**.
5. Salve. A página ficará disponível em:
   `https://<seu-usuario>.github.io/SCORM_UniCV_Ultimate_12094014/`

> **Nota:** O GitHub Pages serve apenas para visualizar a interface. O rastreamento SCORM só funciona quando o pacote é carregado dentro do Moodle (upload do ZIP).

### CORS para GitHub Pages

A playlist é carregada via `fetch(CONFIG.N8N_URL)`. Se a página for servida em `github.io`, a origem é diferente da do webhook. Para a lista de vídeos aparecer no preview, o servidor (ex.: N8N) precisa enviar o cabeçalho `Access-Control-Allow-Origin` adequado (ex.: `*` ou `https://<seu-usuario>.github.io`). Caso contrário, a lista pode não carregar na Page (no Moodle, dentro do LMS, CORS costuma não ser problema).

## Licença

Uso interno UniCV.
