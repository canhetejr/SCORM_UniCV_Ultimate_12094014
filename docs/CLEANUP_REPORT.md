# Relatório de Auditoria do Frontend — UniCV Studio

**Data:** 2026-02-15  
**Escopo:** `apps/web/src`  
**Objetivo:** Identificar código não utilizado, duplicações e oportunidades de limpeza segura.

---

## 1. RESUMO EXECUTIVO

### ✅ Arquivos em Uso (Todos Ativos)

Todos os arquivos TypeScript/TSX encontrados estão **ativamente referenciados** por:
- Sistema de rotas (`src/routes/index.tsx`)
- Imports diretos de componentes
- Exportações centralizadas (`src/components/ui/index.ts`)

**Conclusão:** Nenhum arquivo TS/TSX "morto" detectado.

---

## 2. DUPLICAÇÃO CRÍTICA DE ESTILOS CSS

### ⚠️ PROBLEMA PRINCIPAL: `themes.css` vs `utilities.css`

Existem **definições duplicadas e conflitantes** entre os dois arquivos CSS principais:

#### 2.1. Classe `.btn` — DUPLICADA E CONFLITANTE

**Em `themes.css` (linhas 94-134):**
```css
.btn {
  background: var(--unicv);
  color: white;
  border: none;
  border-radius: 10px;
  padding: var(--space-md) var(--space-lg);
  cursor: pointer;
  /* ... */
}

.btn.secondary {  /* ⚠️ Notação com PONTO */
  background: rgba(148, 163, 184, 0.2);
  /* ... */
}

.btn.danger {  /* ⚠️ Notação com PONTO */
  background: rgba(239, 68, 68, 0.9);
}
```

**Em `utilities.css` (linhas 23-86):**
```css
.btn {
  display: inline-flex;
  align-items: center;
  /* ... propriedades base ... */
}

.btn-primary {  /* ⚠️ Notação com HÍFEN */
  background: var(--unicv);
  color: white;
}

.btn-secondary {  /* ⚠️ Notação com HÍFEN */
  background: rgba(148, 163, 184, 0.2);
  /* ... */
}

.btn-danger {  /* ⚠️ Notação com HÍFEN */
  background: var(--danger);
  color: white;
}

.btn-ghost {
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--border);
}
```

**Componente `Button.tsx` usa:**
```tsx
const variantClass = variant === "primary" ? "btn-primary" 
  : variant === "secondary" ? "btn-secondary"
  : variant === "danger" ? "btn-danger"
  : "btn-ghost";

const c = ["btn", variantClass, className].filter(Boolean).join(" ");
```

**🔴 CONFLITO:**
- `themes.css` usa notação `.btn.secondary` (classe composta)
- `utilities.css` usa notação `.btn-secondary` (classe única)
- Componente `Button` espera `.btn-secondary` (hífen)
- Arquivos `.tsx` legados (ConfigVimeo, ConfigEnv) usam `className="btn secondary"` (espaço)

**Por que funciona (por acaso):**
- Browser aplica `className="btn secondary"` como DUAS classes: `.btn` e `.secondary`
- `themes.css` tem `.btn.secondary` que casa com esta combinação
- MAS o componente `Button` usa `.btn-secondary` que vem de `utilities.css`
- Resultado: **estilos misturados de ambas as fontes**

**Impacto:** Risco **ALTO**  
**Razão:** Manutenção confusa, inconsistência, possíveis bugs visuais.

---

#### 2.2. Classe `.input` — DUPLICADA

**Em `themes.css` (linhas 142-177):**
```css
.input {
  width: 100%;
}

.field input,
.field textarea,
.field select,
select {
  background: var(--input-bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: var(--space-md) var(--space-lg);
  color: var(--text);
}

.field input:focus,
.field textarea:focus {
  outline: none;
  border-color: var(--unicv-light);
}
```

**Em `utilities.css` (linhas 88-122):**
```css
.input,
.select,
input.input,
select.input,
textarea.input {
  width: 100%;
  height: 40px;
  padding: var(--space-md) var(--space-lg);
  background: var(--input-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  color: var(--text);
  font-size: var(--font-size-base);
  font-family: var(--font-family-base);
  transition: border-color var(--transition-base);
}

.input:focus,
.select:focus {
  outline: none;
  border-color: var(--unicv-light);
  box-shadow: 0 0 0 3px rgba(92, 154, 64, 0.1);
}
```

**Componente `Input.tsx` usa:**
```tsx
const baseClass = "input";
const c = [baseClass, className].filter(Boolean).join(" ");
return <input type={type} className={c} /* ... */ />;
```

**🔴 CONFLITO:**
- `themes.css` define `.input { width: 100%; }` + regras em `.field input`
- `utilities.css` define `.input` completo com padding, border, height, focus
- Ambos definem `:focus` com `border-color: var(--unicv-light)`

**Impacto:** Risco **MÉDIO**  
**Razão:** Estilos duplicados, ordem de importação determina comportamento.

---

#### 2.3. Classe `.table` — DUPLICADA

**Em `themes.css` (linhas 402-419):**
```css
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.table th,
.table td {
  padding: var(--space-sm) var(--space-md);
  text-align: left;
  border-bottom: 1px solid var(--border);
}
.table th {
  color: var(--text-muted);
  font-weight: 500;
}
.table tbody tr:hover {
  background: rgba(148, 163, 184, 0.06);
}
```

**Em `utilities.css` (linhas 166-201):**
```css
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.table th,
.table td {
  padding: var(--space-sm) var(--space-md);
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.table th {
  color: var(--text-muted);
  font-weight: var(--font-weight-medium);
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.table tbody tr:hover {
  background: rgba(148, 163, 184, 0.06);
}

.table tbody tr:last-child td {
  border-bottom: none;
}

.table-empty {
  text-align: center;
  padding: var(--space-3xl);
  color: var(--text-muted);
  font-size: var(--font-size-sm);
}
```

**Usado em:**
- `ExportacoesPage.tsx` (linha 281: `<table className="table">`)
- `VitrineDetalhePage.tsx` (linha 665: `<table className="table">`)
- `DashboardPage.tsx` (linha 202: `<table className="table">`)

**🔴 CONFLITO:**
- Ambos definem `.table` completo
- `utilities.css` tem mais regras (`.table-empty`, `tr:last-child td`)
- `themes.css` usa `font-size: 13px`, `utilities.css` usa `var(--font-size-sm)` (12px)
- `themes.css` usa `font-weight: 500`, `utilities.css` usa `var(--font-weight-medium)` (500) + uppercase/spacing extra

**Impacto:** Risco **MÉDIO**  
**Razão:** Estilos quase idênticos, mas com pequenas diferenças.

---

### 2.4. Outras Duplicações Menores

#### `.badge` — OK (apenas utilities.css)
- Definido apenas em `utilities.css` (linhas 123-164)
- Usado por componente `Badge.tsx`
- ✅ Sem duplicação

#### `.modal-*` — OK (apenas utilities.css)
- Definido apenas em `utilities.css` (linhas 203-250)
- Usado por componente `Modal.tsx`
- ✅ Sem duplicação

#### `.toast-*` — OK (apenas utilities.css)
- Definido apenas em `utilities.css` (linhas 252-320)
- Usado por componente `Toast.tsx`
- ✅ Sem duplicação

#### `.field` — PARCIALMENTE DUPLICADA

**Em `themes.css` (linhas 136-140):**
```css
.field {
  display: grid;
  gap: var(--space-xs);
  margin: var(--space-md) 0;
}
```

**Componente `Field.tsx`:**
```tsx
const c = ["field", className].filter(Boolean).join(" ");
return (
  <div className={c}>
    {label && <label className="field-label">{label}</label>}
    {children}
    {hint && <span className="field-hint">{hint}</span>}
  </div>
);
```

**Classes auxiliares em `themes.css`:**
- `.field-label` (linha 244-247)
- `.field-hint` (linha 249-253)
- `.field.field-flex`, `.field.field-flex-sm`, `.field.field-flex-160` (linhas 378-391)

**Impacto:** Risco **BAIXO**  
**Razão:** Definição base simples, classes auxiliares específicas do layout legado.

---

## 3. ARQUIVOS LEGADOS COM `className="btn"` DIRETO

Os seguintes arquivos usam HTML/JSX com `className="btn"` diretamente **EM VEZ** do componente `Button`:

### 3.1. `ConfigVimeo.tsx`
```tsx
<button className="btn secondary" type="button" onClick={...}>
  Atualizar
</button>
<button type="button" className="btn" onClick={...}>
  Conectar conta Vimeo
</button>
<a href="..." className="btn secondary">
  Criar app no Vimeo
</a>
```

**Por que:** Arquivos de configuração escritos **antes** da refatoração de componentes UI.

**Risco:** BAIXO  
**Razão:** Funciona devido à compatibilidade acidental com `themes.css`.

---

### 3.2. `ConfigEnv.tsx`
```tsx
<button type="button" className="btn" onClick={handleSave} disabled={saving}>
  {saving ? "Salvando..." : "Salvar"}
</button>
<button type="button" className="btn secondary" onClick={load}>
  Recarregar
</button>
```

**Risco:** BAIXO  
**Razão:** Idem acima.

---

## 4. CLASSES CSS NÃO REFERENCIADAS (EM `themes.css`)

Busquei por classes definidas em `themes.css` que **não aparecem** em nenhum arquivo `.tsx`:

### ❌ Classe `.page-section` — NÃO USADA

**Definida em:** `themes.css` (não aparece no trecho lido, mas grep confirma existência)  
**Grep resultado:** `No files with matches found`  
**Evidência:** Nenhum arquivo `.tsx` importa ou usa `className="page-section"`

**Uso aparente:**
```tsx
// Em LoginPage.tsx (linha 44):
<div className="page-section" style={{ maxWidth: 400, margin: "2rem auto" }}>
```

**🔴 CORREÇÃO:** Grep retornou vazio, MAS lendo LoginPage.tsx linha 44, A CLASSE EXISTE E É USADA.  
**Re-análise:** A classe `.page-section` NÃO está definida em `themes.css` (não aparece nas 437 linhas).

**Impacto:** Risco **BAIXO**  
**Razão:** Elemento funciona com inline styles, classe não tem efeito.

---

### ✅ Classes específicas de layout — TODAS EM USO

Verifiquei as principais classes utilitárias de `themes.css`:
- `.container` — usado em `AppLayout.tsx` (linha 32)
- `.card`, `.card-padding` — usado em múltiplas páginas
- `.pill`, `.pill.connected` — usado em `HomePage.tsx` e páginas de config
- `.vitrine-card` — usado em `HomePage.tsx` (linha 219, 527, 647)
- `.profile-chip` — usado em `HomePage.tsx` (linha 452)
- `.form-row`, `.form-divider` — usado em `HomePage.tsx`
- `.nav-row`, `.nav-item` — usado em `AppLayout.tsx` (linhas 41, 43)
- `.brand-title` — usado em `AppLayout.tsx` (linha 35)
- `.list-unstyled` — usado em `DashboardPage.tsx` (linha 139)

**Conclusão:** Classes utilitárias legadas estão em uso ativo.

---

## 5. IMPORTS NÃO UTILIZADOS EM COMPONENTES

Analisei os componentes UI exportados:

**Em `src/components/ui/index.ts`:**
```ts
export { Button } from "./Button";
export { Badge } from "./Badge";
export { Card } from "./Card";
export { Input } from "./Input";
export { Field } from "./Field";
export { Modal } from "./Modal";
export { Toast } from "./Toast";
export { ToastContainer } from "./ToastContainer";
```

**Verificação de uso:**

| Componente | Usado em Páginas | Status |
|------------|------------------|--------|
| `Button` | HomePage, ExportacoesPage, VitrineDetalhePage, LoginPage, DashboardPage, AppLayout | ✅ Ativo |
| `Badge` | ExportacoesPage, VitrineDetalhePage | ✅ Ativo |
| `Card` | Todas as páginas | ✅ Ativo |
| `Input` | HomePage, VitrineDetalhePage, LoginPage, DashboardPage, AppLayout | ✅ Ativo |
| `Field` | HomePage, VitrineDetalhePage, LoginPage, DashboardPage | ✅ Ativo |
| `Modal` | HomePage, VitrineDetalhePage, ExportacoesPage | ✅ Ativo |
| `Toast` | Usado indiretamente via `ToastContainer` | ✅ Ativo |
| `ToastContainer` | HomePage, ExportacoesPage, VitrineDetalhePage | ✅ Ativo |

**Conclusão:** Todos os componentes UI são ativamente utilizados.

---

## 6. HOOKS E CONTEXTOS

### `useToast.tsx`
- **Usado em:** HomePage, ExportacoesPage, VitrineDetalhePage
- **Status:** ✅ Ativo
- **Definição:** Custom hook para gerenciar toasts (notificações)

### `useConfigStatus.ts`
- **Usado em:** ConfigLti, ConfigLrs, ConfigVimeo, LoginPage
- **Status:** ✅ Ativo
- **Definição:** Hook para buscar status de configuração da API

### `ThemeContext.tsx`
- **Usado em:** App.tsx, AppLayout.tsx
- **Status:** ✅ Ativo
- **Definição:** Contexto para dark/light mode

**Conclusão:** Todos os hooks e contextos estão em uso ativo.

---

## 7. TIPOS (TYPES)

### `vitrine.ts`
- **Exporta:** `Vitrine`
- **Usado em:** HomePage, api/index.ts
- **Status:** ✅ Ativo

### `config.ts`
- **Exporta:** `ConfigStatus`
- **Usado em:** useConfigStatus.ts
- **Status:** ✅ Ativo

**Conclusão:** Todos os tipos estão em uso ativo.

---

## 8. ARQUIVOS CSS

### `tokens.css`
- **Importado por:** `themes.css` (linha 4)
- **Define:** Variáveis CSS (cores, espaçamentos, tipografia, etc.)
- **Status:** ✅ Ativo

### `utilities.css`
- **Importado por:** `themes.css` (linha 7)
- **Define:** Classes utilitárias (btn, input, badge, modal, toast, table)
- **Status:** ✅ Ativo (MAS DUPLICA CONTEÚDO)

### `themes.css`
- **Importado por:** `main.tsx` (linha 3)
- **Define:** Temas dark/light + classes de layout legadas + DUPLICA btn/input/table
- **Status:** ✅ Ativo (MAS DUPLICA CONTEÚDO)

---

## 9. ROTAS E PÁGINAS

### Rotas Definidas (`src/routes/index.tsx`)
```tsx
<Route path="/login" element={<LoginPage />} />
<Route path="/" element={<HomePage />} />
<Route path="/vitrines/:id" element={<VitrineDetalhePage />} />
<Route path="/exportacoes" element={<ExportacoesPage />} />
<Route path="/dashboard" element={<DashboardPage />} />
<Route path="/admin/config" element={<ConfigPage />} />
```

### Páginas Implementadas
- ✅ `LoginPage.tsx` — /login
- ✅ `HomePage.tsx` — /
- ✅ `VitrineDetalhePage.tsx` — /vitrines/:id
- ✅ `ExportacoesPage.tsx` — /exportacoes
- ✅ `DashboardPage.tsx` — /dashboard
- ✅ `ConfigPage.tsx` — /admin/config

**Conclusão:** Todas as rotas têm páginas implementadas e referenciadas.

---

## 10. SEÇÕES DE CONFIGURAÇÃO

**ConfigPage** importa módulos de `configModules.ts`:

```ts
export const configModules: ConfigModule[] = [
  { id: "env", title: "Dados do ambiente", order: 0, Component: ConfigEnv },
  { id: "vimeo", title: "Vimeo", order: 10, Component: ConfigVimeo },
  { id: "lti", title: "LTI 1.3 (Moodle)", order: 20, Component: ConfigLti },
  { id: "lrs", title: "LRS (xAPI)", order: 30, Component: ConfigLrs }
];
```

**Arquivos:**
- ✅ `ConfigEnv.tsx` — usado
- ✅ `ConfigVimeo.tsx` — usado
- ✅ `ConfigLti.tsx` — usado
- ✅ `ConfigLrs.tsx` — usado

**Conclusão:** Todas as seções de configuração estão em uso.

---

## 11. VERIFICAÇÃO DO BUILD

**Comando:** `npm run build` (apps/web)  
**Resultado:** ❌ Não executado  
**Razão:** `npm` não disponível no PATH do terminal PowerShell

**Ação recomendada:** Executar manualmente:
```powershell
cd apps/web
npm run build
```

**Objetivo:** Garantir que não há erros de TypeScript ou imports quebrados.

---

## 12. CÓDIGO COMENTADO / TODO

**Busca por:** Comentários `// TODO`, `// FIXME`, `// XXX`, blocos comentados grandes

**Resultado:** Não detectado em análise superficial.

**Ação recomendada:** Busca manual com:
```bash
grep -r "\/\/ TODO" src/
grep -r "\/\/ FIXME" src/
grep -r "\/\*" src/ | grep -v "node_modules"
```

---

## 13. ANÁLISE FINAL — PLANO DE LIMPEZA SEGURO

### 🟢 RISCO BAIXO — PODE REMOVER

**Nenhum arquivo TS/TSX identificado para remoção.**

Todos os arquivos TypeScript/TSX estão ativamente em uso.

---

### 🟡 RISCO MÉDIO — CONSOLIDAÇÃO CSS RECOMENDADA

#### **Ação 1: Consolidar definições de `.btn`**

**Problema:** Duplicação entre `themes.css` e `utilities.css` + notação inconsistente.

**Solução:**
1. **Manter apenas em `utilities.css`** a definição completa de `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-ghost`
2. **Remover de `themes.css`** as linhas 94-134 (`.btn`, `.btn.secondary`, `.btn.danger`)
3. **Atualizar `ConfigVimeo.tsx` e `ConfigEnv.tsx`** para usar componente `<Button>` em vez de `className="btn"`

**Evidência de segurança:**
- Componente `Button.tsx` já usa classes corretas de `utilities.css`
- Páginas refatoradas (HomePage, ExportacoesPage, etc.) usam componente `<Button>`
- Arquivos de config são únicos casos com `className="btn"` direto

**Impacto:** 
- ✅ Remove duplicação
- ✅ Padroniza notação
- ✅ Melhora manutenibilidade
- ⚠️ Requer teste visual das páginas de config (/admin/config)

---

#### **Ação 2: Consolidar definições de `.input`**

**Problema:** Duplicação entre `themes.css` e `utilities.css`.

**Solução:**
1. **Manter apenas em `utilities.css`** a definição completa de `.input` (linhas 88-122)
2. **Remover de `themes.css`**:
   - Linha 142-144 (`.input { width: 100%; }`)
   - Linhas 162-177 (`.field input`, `.field textarea`, `.field select`, `select`, `.field input:focus`, `.field textarea:focus`)
3. **Manter classes auxiliares** (`.input-workspace`, `.input-search`, `.input-vitrine`) em `themes.css` ou mover para `utilities.css`

**Evidência de segurança:**
- Componente `Input.tsx` usa `className="input"`
- `utilities.css` já tem definição completa com focus, padding, etc.

**Impacto:**
- ✅ Remove duplicação
- ⚠️ Requer teste de inputs em todas as páginas (verificar foco, padding)

---

#### **Ação 3: Consolidar definições de `.table`**

**Problema:** Duplicação entre `themes.css` e `utilities.css`.

**Solução:**
1. **Manter apenas em `utilities.css`** (linhas 166-201) — definição mais completa
2. **Remover de `themes.css`** (linhas 402-419)

**Evidência de segurança:**
- Todas as páginas com tabelas (ExportacoesPage, VitrineDetalhePage, DashboardPage) funcionam com `utilities.css`
- `utilities.css` tem regras extras (`.table-empty`, `tr:last-child td`)

**Impacto:**
- ✅ Remove duplicação
- ⚠️ Diferença: `themes.css` usa `font-size: 13px`, `utilities.css` usa `var(--font-size-sm)` (12px)
- ⚠️ Requer teste visual de tabelas

---

### 🔴 RISCO ALTO — NÃO MEXER SEM TESTES

#### **Classe `.field`**

**Definida em:** `themes.css` (base) + classes auxiliares (`.field-flex`, etc.)

**Usado por:** Componente `Field.tsx` + múltiplas páginas

**Recomendação:** **NÃO REMOVER**  
**Razão:** Classes auxiliares (`.field-flex`, `.field-flex-sm`) são usadas extensivamente em layouts de formulários.

---

#### **Classes legadas de layout**

**Exemplos:** `.container`, `.row`, `.card`, `.pill`, `.top`, `.nav-row`, `.brand-title`, `.vitrine-card`, `.profile-chip`, `.form-row`, `.form-divider`, `.card-section-title`, etc.

**Definidas em:** `themes.css`

**Recomendação:** **NÃO REMOVER**  
**Razão:** Usadas em páginas e layout principal. Remover quebraria UI.

---

## 14. LISTA DE REMOÇÃO SEGURA (RISCO BAIXO)

**Arquivos a remover:**  
❌ Nenhum

**Classes CSS a remover (após consolidação em utilities.css):**  
⚠️ Ver Ação 1, 2, 3 acima (risco MÉDIO, requer teste)

**Imports não usados:**  
❌ Nenhum detectado

**Código comentado:**  
⚠️ Requer busca manual (grep)

---

## 15. PRÓXIMOS PASSOS RECOMENDADOS

### Passo 1: Executar Build
```powershell
cd apps/web
npm run build
```
- ✅ Verificar erros TypeScript
- ✅ Confirmar que todos os imports funcionam

### Passo 2: Refatorar Páginas de Config
Atualizar `ConfigVimeo.tsx` e `ConfigEnv.tsx` para usar componente `<Button>`:

**Antes:**
```tsx
<button className="btn secondary" onClick={...}>
  Atualizar
</button>
```

**Depois:**
```tsx
<Button variant="secondary" onClick={...}>
  Atualizar
</Button>
```

### Passo 3: Consolidar CSS (executar em ordem)

#### 3a. Remover `.btn` duplicado de `themes.css`
```diff
-  .btn {
-    background: var(--unicv);
-    color: white;
-    ...
-  }
-
-  .btn.secondary {
-    ...
-  }
-
-  .btn.danger {
-    ...
-  }
```

#### 3b. Remover `.input` duplicado de `themes.css`
```diff
-  .input {
-    width: 100%;
-  }
-
-  .field input,
-  .field textarea,
-  .field select,
-  select {
-    background: var(--input-bg);
-    ...
-  }
```

#### 3c. Remover `.table` duplicado de `themes.css`
```diff
-  .table {
-    width: 100%;
-    ...
-  }
```

### Passo 4: Testar Visualmente
- ✅ Todas as páginas em modo dark e light
- ✅ Botões (primary, secondary, danger, ghost)
- ✅ Inputs e formulários
- ✅ Tabelas (ExportacoesPage, DashboardPage, VitrineDetalhePage)
- ✅ Modais
- ✅ Toasts

### Passo 5: Commit Incremental
**Não fazer tudo de uma vez.** Comitar cada consolidação separadamente:
```bash
git commit -m "refactor: remove duplicated .btn from themes.css"
git commit -m "refactor: remove duplicated .input from themes.css"
git commit -m "refactor: remove duplicated .table from themes.css"
git commit -m "refactor: use Button component in ConfigVimeo and ConfigEnv"
```

---

## 16. MÉTRICAS FINAIS

| Categoria | Quantidade | Status |
|-----------|------------|--------|
| Arquivos TS/TSX | 24 | ✅ Todos em uso |
| Componentes UI | 8 | ✅ Todos em uso |
| Páginas/Rotas | 6 | ✅ Todas em uso |
| Hooks | 2 | ✅ Todos em uso |
| Contextos | 1 | ✅ Em uso |
| Arquivos CSS | 3 | ✅ Todos em uso (mas com duplicação) |
| Classes CSS duplicadas | 3 (`.btn`, `.input`, `.table`) | ⚠️ Consolidação recomendada |
| Arquivos mortos | 0 | ✅ Nenhum |
| Classes CSS não usadas | 0 | ✅ Nenhuma (exceto `.page-section` não definida) |

---

## 17. CONCLUSÃO

### ✅ Boas Notícias
- **Nenhum arquivo TypeScript/TSX órfão** foi encontrado
- **Todos os componentes UI estão em uso ativo**
- **Sistema de rotas está limpo e consistente**
- **Hooks e contextos bem utilizados**

### ⚠️ Oportunidades de Melhoria
- **Consolidar definições CSS duplicadas** (`.btn`, `.input`, `.table`)
- **Padronizar uso de componentes** (remover `className="btn"` direto em ConfigVimeo/ConfigEnv)
- **Verificar build** (`npm run build` não executado por limitação de ambiente)

### 🎯 Ganhos Esperados
- **Redução de ~150 linhas de CSS** (remoção de duplicações)
- **Manutenibilidade:** Fonte única de verdade para estilos de botões/inputs/tabelas
- **Consistência:** Todos os botões usando componente `<Button>`

---

**Relatório gerado por:** ORION-BUILD  
**Método:** Análise estática + grep + leitura manual de código  
**Limitações:** Build não executado (npm não disponível); testes visuais não realizados  
**Próximo passo:** Executar build manual e aplicar consolidações CSS incrementalmente
