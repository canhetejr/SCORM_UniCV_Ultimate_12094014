# ✅ Checklist Deploy UNICV Studio no Coolify (1 Página)

## 🎯 Objetivo
Subir DB + API + WEB em 15 passos copy/paste.

---

## 📋 PASSOS (em ordem)

### 1. Criar Recurso no Coolify
- Tipo: **Docker Compose**
- Projeto: Novo ou existente

### 2. Conectar GitHub/Git
- Repo: `SEU_USUARIO/SCORM_UniCV_Ultimate_12094014`
- Branch: `main`

### 3. Selecionar Compose
- Arquivo: `docker-compose.yml` (raiz do repo)

### 4. Configurar Variáveis Obrigatórias
Colar no Coolify (aba Environment):

```env
# Banco
POSTGRES_PASSWORD=SenhaSeguraDB123

# API - Admin
ADMIN_USER=admin
ADMIN_PASSWORD=SenhaAdminSegura123!

# API - Secrets (gerar aleatórios 32+ chars)
COOKIE_SECRET=SEU_SECRET_32CHARS_AQUI
SESSION_SECRET=SEU_SECRET_32CHARS_AQUI
ADMIN_JWT_SECRET=SEU_SECRET_32CHARS_AQUI

# API - URLs
BASE_URL=https://api.unicv.seudominio.com
API_BASE_URL=https://api.unicv.seudominio.com
PUBLIC_BASE_URL=https://api.unicv.seudominio.com

# WEB - Build-time (Vite)
# NOTA: Mudar essas requer REBUILD do web
# (API_BASE_URL já está acima)
```

### 5. Configurar Volume Persistente
- Serviço: `api`
- Volume host: `/data/unicv/exports`
- Volume container: `/data/exports` (já definido no compose)

### 6. Configurar Domínio da API
- Serviço: `api`
- Domínio: `api.unicv.seudominio.com`
- SSL: Ativar (Let's Encrypt)

### 7. Configurar Domínio do WEB
- Serviço: `web`
- Domínio: `unicv.seudominio.com` ou `studio.unicv.seudominio.com`
- SSL: Ativar (Let's Encrypt)

### 8. Deploy Inicial
- Clicar: **Deploy**
- Aguardar: 3-5 min (build + start)

### 9. Verificar Logs
- DB: deve mostrar `database system is ready`
- API: deve mostrar `Server listening on 0.0.0.0:3001`
- WEB: deve mostrar `nginx` rodando

### 10. Health Check da API
```bash
curl https://api.unicv.seudominio.com/health
# Esperado: {"status":"ok"}
```

### 11. Testar Login
- Acessar: `https://unicv.seudominio.com`
- Login: `admin` / `SenhaAdminSegura123!` (do passo 4)
- Deve entrar no painel

### 12. Testar Player
- Criar vitrine de teste no painel
- Copiar link do player
- Abrir: `https://api.unicv.seudominio.com/player/index.html?vitrine_id=SLUG`
- Deve carregar sem erro 404

### 13. (Opcional) Vimeo OAuth
Se quiser importar showcases do Vimeo:
```env
VIMEO_CLIENT_ID=SEU_CLIENT_ID
VIMEO_CLIENT_SECRET=SEU_CLIENT_SECRET
VIMEO_REDIRECT_URI=https://api.unicv.seudominio.com/v1/vimeo/oauth/callback
```
Criar app em: https://developer.vimeo.com/apps

### 14. (Opcional) Webhook Auto-Deploy
- Coolify: copiar webhook URL
- GitHub: Settings → Webhooks → Add
- Evento: `push` em `main`
- Agora push = auto-deploy 🚀

### 15. Smoke Test Remoto (validação final)
```bash
# Na sua máquina local
export API_URL=https://api.unicv.seudominio.com
export ADMIN_USER=admin
export ADMIN_PASSWORD=SenhaAdminSegura123!
npm run smoke
```

---

## 🐛 Problemas Comuns

| Erro | Causa | Solução |
|------|-------|---------|
| API não sobe | DB não pronto | Aguardar DB health check (verde) |
| 503 no login | ADMIN_USER/PASSWORD vazios | Adicionar vars, redeploy |
| CORS no web | VITE_API_BASE_URL errado | Corrigir var, **rebuild** web |
| Player 404 | PUBLIC_BASE_URL errado | Corrigir, redeploy API |

---

## 📊 Checklist Final

- [ ] `curl https://api.DOMINIO/health` → `{"status":"ok"}`
- [ ] Login funciona com admin user/pass
- [ ] Player carrega em `/player/index.html`
- [ ] SSL ativo (cadeado verde)
- [ ] Logs sem erros críticos
- [ ] Smoke test passou
- [ ] Webhook configurado (opcional)

---

**🎉 Deploy completo! UNICV Studio está no ar!**

Documentação completa: `studio/COOLIFY.md`
Variáveis exemplo: `studio/.env.coolify.example`
