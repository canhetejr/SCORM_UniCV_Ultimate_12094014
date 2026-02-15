# Reorganização do Frontend — Log de Alterações

**Data:** 2026-02-15  
**Objetivo:** Reorganizar estrutura de pastas e código do frontend React sem alterar funcionalidades.

---

## 📂 Estrutura Criada

### Nova pasta
- `src/components/app/` — Reservada para componentes específicos de aplicação (tabelas, cards, formulários customizados)

### Novos helpers em `src/lib/`

| Arquivo | Funções | Descrição |
|---------|---------|-----------|
| `urls.ts` | `buildPlayerUrl()`, `buildDownloadUrl()` | Construtores de URLs do player e downloads |
| `download.ts` | `downloadFile()`, `getExportFilename()` | Download de arquivos autenticados + geração de nomes |
| `storage.ts` | `saveToStorage()`, `loadFromStorage()`, `removeFromStorage()` | Helpers para localStorage com JSON |
| `slugify.ts` | `slugify()` | Converte texto para slug URL-friendly |

### Atualizações
- `src/lib/index.ts` — Barrel export atualizado para incluir novos helpers

---

## 🔄 Refatorações Aplicadas

### Páginas atualizadas

#### `pages/vitrines/VitrineDetalhePage.tsx`
**Antes:**
```ts
const playerSlug = vitrine?.slug?.trim() || null;
const playerUrl = playerSlug
  ? `${PUBLIC_BASE_URL}/p/${encodeURIComponent(playerSlug)}`
  : id
    ? `${PUBLIC_BASE_URL}/player/index.html?vitrine_id=${encodeURIComponent(id)}`
    : "#";

const handleDownload = (job) => {
  // ... 10 linhas de código fetch + blob + createElement
};
```

**Depois:**
```ts
const playerUrl = buildPlayerUrl(id, vitrine?.slug, PUBLIC_BASE_URL);

const handleDownload = async (job) => {
  const url = `${API_BASE}${job.downloadUrl}`;
  const token = getAuthToken();
  const filename = getExportFilename(job.type, job.title);
  await downloadFile(url, filename, token);
};
```

**Resultado:** -15 linhas, código mais legível e reutilizável.

---

#### `pages/exportacoes/ExportacoesPage.tsx`
**Antes:**
```ts
import { formatDate } from "../../lib/formatters";
import { STATUS_LABELS, STATUS_BADGE_VARIANT, TYPE_LABELS } from "../../lib/constants";

const handleDownload = (job) => {
  // ... 10 linhas de código fetch + blob + createElement
};
```

**Depois:**
```ts
import { formatDate, STATUS_LABELS, STATUS_BADGE_VARIANT, TYPE_LABELS, downloadFile, getExportFilename } from "../../lib";

const handleDownload = async (job) => {
  const url = `${API_BASE}${job.downloadUrl}`;
  const token = getAuthToken();
  const filename = getExportFilename(job.type, job.title);
  await downloadFile(url, filename, token);
};
```

**Resultado:** Imports consolidados via barrel export, código de download reutilizável.

---

#### `pages/home/HomePage.tsx`
**Antes:**
```ts
import { STATUS_OPTIONS } from "../../lib/constants";
```

**Depois:**
```ts
import { STATUS_OPTIONS } from "../../lib";
```

**Resultado:** Import via barrel export (padrão recomendado).

---

## 📚 Documentação Atualizada

### `ARCHITECTURE.md` — Adições

1. **Nova seção:** "Biblioteca de Helpers (`lib/`)"
   - Documentação completa de todos os helpers
   - Exemplos de uso com código

2. **Tabela "Onde Colocar Cada Coisa"** — Expandida:
   - Funções de URLs → `lib/urls.ts`
   - Funções de download → `lib/download.ts`
   - Funções de storage → `lib/storage.ts`
   - Função slugify → `lib/slugify.ts`
   - Componentes específicos de app → `components/app/`

3. **Boas Práticas** — Adicionadas:
   - "Use barrel exports: `import { X } from "../../lib"`"
   - "Helpers reutilizáveis: URLs, downloads, slugs → sempre em `lib/` com tipos TypeScript"
   - "Componentes específicos: se usado em 2+ páginas, mova para `components/app/`"

---

## ✅ Validação

- ✅ **Linter:** Sem erros em todos os arquivos alterados
- ✅ **TypeScript:** Sem erros de tipos
- ✅ **Imports:** Todos resolvidos corretamente
- ✅ **Funcionalidade:** Nenhuma lógica ou comportamento alterado

---

## 📊 Métricas

| Métrica | Antes | Depois | Δ |
|---------|-------|--------|---|
| Helpers em `lib/` | 2 arquivos | 6 arquivos | +4 |
| Linhas duplicadas (download) | ~20 | 0 | -20 |
| Imports consolidados | Esparsos | Barrel exports | ✅ |
| Documentação helpers | Nenhuma | Completa | ✅ |

---

## 🎯 Próximos Passos (Sugeridos)

1. **Componentes `app/`:** Extrair componentes reutilizáveis específicos de páginas:
   - `VitrineTable` (tabela de vitrines)
   - `ExportJobCard` (card de job de exportação)
   - `VideoListItem` (item de playlist)

2. **Hooks:** Considerar criar:
   - `useVitrine(id)` — hook para carregar e gerenciar vitrine
   - `useExportJobs(filters)` — hook para listar jobs com filtros

3. **Validação:** Adicionar testes unitários para helpers em `lib/`

---

**Status:** ✅ Reorganização concluída com sucesso.
