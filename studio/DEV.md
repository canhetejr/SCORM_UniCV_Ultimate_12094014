# 🚀 UNICV Studio - Guia de Desenvolvimento

Guia rápido e direto para rodar, validar e resolver problemas comuns no desenvolvimento.

---

## 📦 Como Rodar

### 1. Instalar dependências (primeira vez)

```bash
npm install
```

### 2. Configurar ambiente

Copie o arquivo de exemplo e defina as variáveis:

```bash
cp studio/api/.env.example studio/api/.env
```

**Variáveis obrigatórias** (edite `studio/api/.env`):

```env
DATABASE_URL="file:./dev.db"
ADMIN_USER="admin"
ADMIN_PASSWORD="suasenha123"
SESSION_SECRET="gereumsecretaleatorioaqui"
```

**Variáveis opcionais** (para integração Vimeo):

```env
VIMEO_CLIENT_ID="..."
VIMEO_CLIENT_SECRET="..."
```

### 3. Iniciar modo desenvolvimento

```bash
npm run dev
```

Isso inicia **API + Web** simultaneamente:
- **API:** http://localhost:3001
- **Web:** http://localhost:5173
- **Player:** http://localhost:3001/player/index.html

---

## 🛠️ Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Inicia API + Web em modo watch |
| `npm run dev:api` | Inicia apenas a API |
| `npm run dev:web` | Inicia apenas o Web |
| `npm run build` | Builda API + Web (valida TypeScript) |
| `npm run check` | Verifica compilação (TypeScript + build) |
| `npm run doctor` | Diagnóstico: portas, URLs, .env faltando |

---

## ⚠️ Resolver Problemas Comuns

### Erro: `EADDRINUSE` (porta já em uso)

#### Opção 1: Matar processo manualmente

**Windows (PowerShell):**

```powershell
# Porta 3001 (API)
netstat -ano | findstr :3001
# Anote o PID e mate:
taskkill /PID <PID> /F

# Porta 5173 (Web)
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

**Linux/macOS:**

```bash
# Porta 3001 (API)
lsof -i :3001
kill -9 <PID>

# Porta 5173 (Web)
lsof -i :5173
kill -9 <PID>
```

#### Opção 2: Mudar a porta

Edite o arquivo de configuração:

**API:** `studio/api/src/server.ts`
```typescript
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3002; // mudou de 3001 para 3002
```

**Web:** `studio/web/vite.config.ts`
```typescript
server: {
  port: 5174 // mudou de 5173 para 5174
}
```

---

### Erro: `503 Service Unavailable` no login

**Causa:** Variáveis `ADMIN_USER` e `ADMIN_PASSWORD` não definidas no `.env`.

**Solução:**

1. Abra `studio/api/.env`
2. Defina:
   ```env
   ADMIN_USER="admin"
   ADMIN_PASSWORD="suasenha123"
   ```
3. Reinicie a API (`Ctrl+C` e `npm run dev:api`)

---

### Erro: `Cannot find module 'primsa/client'`

**Causa:** Prisma não gerado.

**Solução:**

```bash
cd studio/api
npm run prisma:generate
```

---

### Erro: TypeScript reclama de tipos

**Causa:** Build anterior com erros ou cache.

**Solução:**

```bash
# Limpar tudo
npm run clean

# Reinstalar
npm install

# Rodar novamente
npm run dev
```

---

## 🔍 Diagnóstico Rápido

Execute o **doctor** para verificar tudo de uma vez:

```bash
npm run doctor
```

**Output esperado:**

```
🔍 UNICV Studio - Doctor
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📡 PORTAS:
  API (3001):  ✅ LIVRE
  Web (5173): ✅ LIVRE

🌐 URLS:
  API:    http://localhost:3001
  Web:    http://localhost:5173
  Player: http://localhost:3001/player/index.html

🔧 VARIÁVEIS DE AMBIENTE:
  ✅ DATABASE_URL        (Banco de dados)
  ✅ ADMIN_USER          (Usuário admin)
  ✅ ADMIN_PASSWORD      (Senha admin)
  ✅ SESSION_SECRET      (Secret para sessões)
  ✅ VIMEO_CLIENT_ID/SECRET (Opcional)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ TUDO PRONTO PARA DESENVOLVIMENTO!

  Execute: npm run dev
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 📝 Checklist de Setup Inicial

- [ ] `npm install` executado
- [ ] `.env` copiado de `.env.example`
- [ ] Variáveis obrigatórias definidas (ADMIN_USER, ADMIN_PASSWORD, etc)
- [ ] `npm run doctor` retorna ✅ verde
- [ ] `npm run dev` inicia sem erros
- [ ] Web abre em http://localhost:5173
- [ ] Login funciona com credenciais do .env

---

## 🆘 Ainda com problemas?

1. Execute `npm run doctor` e cole o output
2. Execute `npm run check` e veja erros de TypeScript
3. Verifique logs da API e Web no terminal

Se o erro persistir, abra um issue com:
- Output de `npm run doctor`
- Mensagem de erro completa
- Sistema operacional (Windows/Linux/macOS)
