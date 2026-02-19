# Vimeo Clone — Entrega e Testes

## 1. Arquivos criados e alterados

### Backend (studio/api)

- **Criados**
  - `src/services/cryptoTokens.ts` — Criptografia AES-256-GCM para tokens (encrypt/decrypt, chave 32 bytes base64).
  - `src/services/vimeoClient.ts` — Cliente Vimeo para o clone: timeout 15s, 429 Retry-After, 5xx retry com backoff, paginação (per_page=100), getMe, listAllAlbums, listAllAlbumVideos.
  - `src/services/vimeoCloneSync.ts` — syncProfileFull e syncProfileIncremental; concorrência limitada (3); upsert por showcase.
  - `src/routes/adminVimeoClone.ts` — Rotas admin: POST/GET/DELETE profiles, POST sync, GET showcases, GET videos, POST import-to-studio.

- **Alterados**
  - `prisma/schema.prisma` — Models VimeoProfile, VimeoShowcase, VimeoVideo, VimeoShowcaseVideo.
  - `src/env.ts` — Variável opcional VIMEO_TOKEN_ENCRYPTION_KEY.
  - `src/server.ts` — Registro das rotas em `/admin/vimeo-clone`.

### Frontend (studio/web)

- **Criados**
  - `src/api/adminVimeoClone.ts` — Cliente API para perfis, sync, showcases, vídeos, import-to-studio e helper getBestThumbUrl.
  - `src/pages/tools/VimeoClonePage.tsx` — Página: perfis (adicionar, Coletar tudo, Atualizar, Remover), busca de vitrines por perfil, modal de vídeos, Importar para Studio.

- **Alterados**
  - `src/routes/index.tsx` — Rota `/ferramentas/vimeo-clone` e import de VimeoClonePage.
  - `src/pages/tools/ToolsPage.tsx` — Card/link “Vimeo Clone (multi-perfil)” que leva a `/ferramentas/vimeo-clone`.

---

## 2. Como testar com curl

Requisitos: API a correr (ex.: `http://localhost:3002`), token JWT admin (obtido em POST `/v1/admin/login`) e, para criar perfil, `VIMEO_TOKEN_ENCRYPTION_KEY` em base64 (32 bytes) no .env da API.

Obter token admin:

```bash
curl -s -X POST http://localhost:3002/v1/admin/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"SEU_ADMIN_USER\",\"password\":\"SEU_ADMIN_PASSWORD\"}"
```

Use o `token` devolvido em `Authorization: Bearer <token>` nas chamadas abaixo.

### Adicionar perfil

```bash
export TOKEN="seu_jwt_aqui"
curl -s -X POST http://localhost:3002/admin/vimeo-clone/profiles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"accessToken\":\"SEU_VIMEO_ACCESS_TOKEN\",\"label\":\"Meu perfil\"}"
```

Resposta esperada: `{"ok":true,"data":{"profile":{...}}}` (sem campo `accessToken`).

### Listar perfis

```bash
curl -s http://localhost:3002/admin/vimeo-clone/profiles \
  -H "Authorization: Bearer $TOKEN"
```

Resposta: `{"ok":true,"data":{"profiles":[...]}}`.

### Sync completo

```bash
export PROFILE_ID="id_do_perfil_retornado_acima"
curl -s -X POST "http://localhost:3002/admin/vimeo-clone/profiles/$PROFILE_ID/sync?mode=full" \
  -H "Authorization: Bearer $TOKEN"
```

Resposta: `{"ok":true,"data":{"showcasesUpserted":N,"videosUpserted":N,"linksUpserted":N,"linksRemovedMarked":N}}`.

### Listar vitrines (showcases) do perfil

```bash
curl -s "http://localhost:3002/admin/vimeo-clone/profiles/$PROFILE_ID/showcases?page=1&perPage=20" \
  -H "Authorization: Bearer $TOKEN"
```

Com filtro por texto:

```bash
curl -s "http://localhost:3002/admin/vimeo-clone/profiles/$PROFILE_ID/showcases?q=texto&page=1&perPage=20" \
  -H "Authorization: Bearer $TOKEN"
```

### Listar vídeos de uma vitrine

```bash
export SHOWCASE_ID="id_do_showcase_retornado_na_listagem"
curl -s "http://localhost:3002/admin/vimeo-clone/profiles/$PROFILE_ID/showcases/$SHOWCASE_ID/videos?page=1&perPage=20" \
  -H "Authorization: Bearer $TOKEN"
```

### Importar vitrine para o Studio

```bash
curl -s -X POST "http://localhost:3002/admin/vimeo-clone/showcases/$SHOWCASE_ID/import-to-studio" \
  -H "Authorization: Bearer $TOKEN"
```

Resposta: `{"ok":true,"data":{"vitrineId":"...","message":"Vitrine importada para o Studio."}}`.

---

## 3. Como testar pela UI

1. **Login**  
   Aceder a `/login` e autenticar com utilizador/senha admin.

2. **Abrir Vimeo Clone**  
   Ir a **Ferramentas** e clicar no card **“Vimeo Clone (multi-perfil)”** (ou abrir diretamente `/ferramentas/vimeo-clone`).

3. **Perfis**
   - Clicar em **“Adicionar perfil”**.
   - No modal: colar o **Access Token** do Vimeo (nunca é mostrado no frontend após envio) e, opcionalmente, um **Label**.
   - Submeter; o perfil deve aparecer na lista com nome/uri do /me.
   - Em cada perfil: **“Coletar tudo”** (sync full), **“Atualizar”** (incremental), **“Remover”**.

4. **Vitrines**
   - Escolher o perfil no dropdown.
   - Opcional: preencher o campo de busca (nome/descrição/ID) e clicar **“Buscar”**.
   - Ver lista em grade (thumb, nome, vimeoId, total de vídeos, data).
   - **“Ver vídeos”** abre o modal com thumb, título, duração, link e **“Copiar link”** / **“Copiar embed”**.

5. **Importar para Studio**
   - Na mesma grade de vitrines: **“Importar para Studio”** em uma vitrine.
   - Ver toaste de sucesso com vitrineId; a vitrine passa a existir na Home/Studio com `vimeoShowcaseId` e vídeos associados.

---

## 4. Segurança e garantias

- **Token Vimeo nunca no frontend**  
  O token é enviado uma vez no POST “Adicionar perfil” e guardado no backend. Todas as rotas de clone são `/admin/*` e só devolvem dados públicos do perfil (sem `accessTokenEnc`). O frontend nunca recebe nem exibe o token.

- **Rotas admin protegidas**  
  O `preHandler` em `server.ts` exige JWT admin para qualquer path que não esteja em `isPublicPath`. Nenhum path `/admin/*` está em `isPublicPath`, logo todas as rotas `/admin/vimeo-clone/*` exigem login admin.

- **Tokens no banco criptografados**  
  Uso de `VIMEO_TOKEN_ENCRYPTION_KEY` (32 bytes em base64) e AES-256-GCM com IV aleatório em `cryptoTokens.ts`. Sem esta variável, não é possível adicionar perfis (resposta 400 com mensagem clara).

- **Respostas normalizadas**  
  Erros devolvem `{ ok: false, error: { code, message } }`; códigos como `invalid_input`, `vimeo_auth_failed`, `vimeo_rate_limited`, `sync_failed`, etc. Stack e resposta crua do Vimeo não são enviados ao cliente.

- **Inputs validados**  
  Trim, tamanhos máximos e padrões aplicados nos body/query (ex.: accessToken, label, ids, q, page, perPage).

---

## 5. Configuração e migração

- **Variável de ambiente**  
  No `.env` da API:

  ```env
  VIMEO_TOKEN_ENCRYPTION_KEY=<base64 de 32 bytes>
  ```

  Gerar chave (exemplo em Node):

  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  ```

- **Base de dados**  
  Após alterações no `schema.prisma`, gerar o client e aplicar migrações:

  ```bash
  cd studio/api
  npx prisma generate
  npx prisma migrate dev --name vimeo_clone_models
  ```

Depois disso, a API e a UI do Vimeo Clone ficam prontas para uso conforme descrito acima.
