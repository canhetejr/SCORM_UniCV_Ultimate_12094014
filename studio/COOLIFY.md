# 🚀 Deploy UNICV Studio no Coolify

Guia passo a passo super simples para fazer deploy do UNICV Studio no Coolify.

---

## 📋 Pré-requisitos

- Conta no Coolify (ou auto-hospedado)
- Repositório Git (GitHub, GitLab, etc)
- Domínio configurado (ex: `unicv.seusite.com`)

---

## 🗄️ Passo 1: Criar Banco de Dados PostgreSQL

1. No Coolify, vá em **Databases** → **+ Add**
2. Escolha **PostgreSQL**
3. Configure:
   - **Name:** `unicv-postgres`
   - **Version:** Latest (ou 16+)
   - **Database Name:** `unicv`
   - **Username:** `unicv`
   - **Password:** Gere uma senha forte (anote!)
4. Clique em **Deploy**
5. Aguarde o PostgreSQL iniciar
6. **Copie a Connection String** (formato: `postgresql://unicv:senha@host:5432/unicv`)

---

## 🔧 Passo 2: Criar Aplicação API

### 2.1. Adicionar Aplicação

1. Vá em **Applications** → **+ Add**
2. Escolha **Git Repository**
3. Configure:
   - **Repository:** Selecione seu repo
   - **Branch:** `main` (ou sua branch principal)
   - **Build Pack:** **Dockerfile**
   - **Dockerfile Location:** `studio/api/Dockerfile`
   - **Base Directory:** `studio/api`
   - **Port:** `3001`

### 2.2. Definir Variáveis de Ambiente

Vá na aba **Environment Variables** e adicione:

```env
# Banco de Dados
DATABASE_URL=postgresql://unicv:SENHA@unicv-postgres:5432/unicv

# Admin (Login)
ADMIN_USER=admin
ADMIN_PASSWORD=SuaSenhaSegura123!

# Sessão/JWT
SESSION_SECRET=geresecretaleatório32caracteres
ADMIN_JWT_SECRET=outrosecretaleatório32chars

# Base URL (domínio da API)
BASE_URL=https://api.unicv.seusite.com

# Vimeo (opcional - deixe vazio se não usar)
VIMEO_CLIENT_ID=
VIMEO_CLIENT_SECRET=
VIMEO_REDIRECT_URI=

# Exportações
EXPORTS_DIR=/data/exports

# LTI (opcional - deixe vazio se não usar)
LTI_PLATFORM_ISSUER=
LTI_PLATFORM_CLIENT_ID=
LTI_PLATFORM_AUTH_LOGIN_URL=
LTI_PLATFORM_KEYSET_URL=
LTI_PLATFORM_DEPLOYMENT_ID=
LTI_TOOL_PRIVATE_KEY_PEM=

# xAPI/LRS (opcional)
LRS_ENDPOINT=
LRS_BASIC_AUTH=
```

**IMPORTANTE:** Substitua:
- `SENHA` pela senha do PostgreSQL (do Passo 1)
- `api.unicv.seusite.com` pelo seu domínio da API
- Gere secrets aleatórios para `SESSION_SECRET` e `ADMIN_JWT_SECRET`

### 2.3. Configurar Persistent Storage

1. Vá na aba **Storage**
2. Adicione volume:
   - **Host Path:** `/data/unicv/exports`
   - **Container Path:** `/data/exports`
3. Salve

### 2.4. Deploy

1. Clique em **Deploy**
2. Aguarde o build e deploy completarem
3. Verifique logs para erros

### 2.5. Configurar Domínio

1. Vá na aba **Domains**
2. Adicione: `api.unicv.seusite.com`
3. Configure SSL (Let's Encrypt automático)

---

## 🌐 Passo 3: Criar Aplicação Web

### 3.1. Adicionar Aplicação

1. Vá em **Applications** → **+ Add**
2. Escolha **Git Repository**
3. Configure:
   - **Repository:** Mesmo repo
   - **Branch:** `main`
   - **Build Pack:** **Dockerfile**
   - **Dockerfile Location:** `studio/web/Dockerfile`
   - **Base Directory:** `studio/web`
   - **Port:** `80`

### 3.2. Definir Variáveis de Ambiente

Vá na aba **Environment Variables** e adicione:

```env
# URL da API (domínio da API do Passo 2)
VITE_API_BASE_URL=https://api.unicv.seusite.com

# URL pública do player (mesmo domínio da API)
VITE_PUBLIC_BASE_URL=https://api.unicv.seusite.com
```

### 3.3. Deploy

1. Clique em **Deploy**
2. Aguarde o build completar
3. Verifique logs para erros

### 3.4. Configurar Domínio

1. Vá na aba **Domains**
2. Adicione: `unicv.seusite.com` (ou `studio.unicv.seusite.com`)
3. Configure SSL (Let's Encrypt automático)

---

## ✅ Passo 4: Testar o Deploy

### 4.1. Health Check da API

Abra no navegador:
```
https://api.unicv.seusite.com/health
```

**Esperado:**
```json
{"status":"ok"}
```

### 4.2. Testar Login

1. Abra: `https://unicv.seusite.com`
2. Faça login com as credenciais definidas em `ADMIN_USER` e `ADMIN_PASSWORD`
3. Se funcionar, você está dentro! 🎉

### 4.3. Testar Player

1. Crie uma vitrine de teste
2. Copie o link do player (ex: `/p/teste`)
3. Abra: `https://api.unicv.seusite.com/player/index.html?vitrine_id=teste`
4. Deve carregar o player sem erros

---

## 🔄 Passo 5: Configurar Auto-Deploy (opcional)

### 5.1. Webhook do Git

1. Em cada aplicação (API e Web), vá na aba **Webhooks**
2. Copie a URL do webhook
3. No GitHub/GitLab:
   - Vá em **Settings** → **Webhooks**
   - Cole a URL
   - Eventos: `push`
4. Agora, cada push na branch `main` fará deploy automático!

---

## 🐛 Troubleshooting

### Erro: "Database connection failed"

**Causa:** `DATABASE_URL` incorreta ou PostgreSQL não iniciado.

**Solução:**
1. Verifique se o PostgreSQL está rodando (verde no Coolify)
2. Copie novamente a Connection String do PostgreSQL
3. Atualize `DATABASE_URL` na API
4. Redeploy a API

---

### Erro: "503 Service Unavailable" no login

**Causa:** `ADMIN_USER` ou `ADMIN_PASSWORD` não definidos.

**Solução:**
1. Vá em **Environment Variables** da API
2. Verifique se `ADMIN_USER` e `ADMIN_PASSWORD` estão definidos
3. Redeploy a API

---

### Erro: "CORS" na Web

**Causa:** `VITE_API_BASE_URL` incorreta.

**Solução:**
1. Verifique se `VITE_API_BASE_URL` aponta para o domínio correto da API
2. **IMPORTANTE:** Deve incluir `https://` (não `http://`)
3. Redeploy o Web

---

### Player não carrega vídeos

**Causa:** `PUBLIC_BASE_URL` incorreta na API.

**Solução:**
1. Vá em **Environment Variables** da API
2. Defina `BASE_URL=https://api.unicv.seusite.com`
3. Redeploy a API

---

## 📊 Checklist Final

Antes de considerar o deploy concluído:

- [ ] PostgreSQL rodando e acessível
- [ ] API acessível em `https://api.unicv.seusite.com/health`
- [ ] Web acessível em `https://unicv.seusite.com`
- [ ] Login funciona com credenciais definidas
- [ ] Player carrega em `https://api.unicv.seusite.com/player/index.html`
- [ ] SSL ativo (cadeado verde no navegador)
- [ ] Logs da API sem erros críticos
- [ ] Persistent storage configurado para `/data/exports`

---

## 🆘 Precisa de Ajuda?

### Comandos Úteis

**Ver logs da API:**
```bash
# No Coolify, vá na aba Logs da aplicação API
```

**Testar localmente antes do deploy:**
```bash
# Na raiz do projeto
npm run smoke
```

**Verificar variáveis de ambiente:**
```bash
# No Coolify, aba Environment Variables de cada app
```

### Smoke Test Remoto

Execute na sua máquina local:

```bash
# Substitua pela URL da sua API
export API_URL=https://api.unicv.seusite.com
export ADMIN_USER=admin
export ADMIN_PASSWORD=SuaSenha

npm run smoke
```

---

## 📝 Notas Importantes

1. **Backups:** Configure backups automáticos do PostgreSQL no Coolify
2. **Monitoramento:** Ative notificações de falha no Coolify
3. **Secrets:** Nunca commite arquivos `.env` no Git
4. **Updates:** Para atualizar, só fazer push no Git (se webhook configurado)
5. **Migrations:** Prisma migrations rodam automaticamente no build da API

---

**🎉 Deploy concluído! Seu UNICV Studio está no ar!**
