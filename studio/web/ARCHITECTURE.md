# Arquitetura do Frontend — UniCV Studio

> **Última atualização:** 2026-02-15

Este documento descreve a estrutura de pastas, convenções e padrões do frontend React do UniCV Studio.

---

## Estrutura de Pastas

```
studio/web/src/
├── api/                  # Cliente da API (fetch wrappers, types)
│   └── index.ts          # Funções apiGet, apiPost, tipos, autenticação
├── components/
│   ├── ui/               # Componentes UI base (design system)
│   │   ├── Button.tsx
│   │   ├── Badge.tsx
│   │   ├── Card.tsx
│   │   ├── Field.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Toast.tsx
│   │   ├── ToastContainer.tsx
│   │   └── index.ts      # Barrel export
│   └── app/              # Componentes específicos de aplicação
│       └── .gitkeep      # (Reservado para tabelas, cards, formulários customizados)
├── contexts/             # React Contexts (tema, autenticação, etc.)
│   └── ThemeContext.tsx
├── hooks/                # Hooks customizados reutilizáveis
│   ├── useToast.tsx      # Sistema de notificações
│   └── useConfigStatus.ts
├── layouts/              # Layouts compartilhados (shell, sidebar, etc.)
│   └── AppLayout.tsx
├── lib/                  # Funções utilitárias e helpers
│   ├── formatters.ts     # formatDate, formatDuration
│   ├── constants.ts      # STATUS_OPTIONS, TYPE_LABELS, STATUS_BADGE_VARIANT
│   ├── urls.ts           # buildPlayerUrl, buildDownloadUrl
│   ├── download.ts       # downloadFile, getExportFilename
│   ├── storage.ts        # saveToStorage, loadFromStorage, removeFromStorage
│   ├── slugify.ts        # slugify (converte texto para slug URL-friendly)
│   └── index.ts          # Barrel export (facilita imports)
├── pages/                # Páginas/rotas da aplicação
│   ├── home/
│   │   └── HomePage.tsx
│   ├── vitrines/
│   │   └── VitrineDetalhePage.tsx
│   ├── exportacoes/
│   │   └── ExportacoesPage.tsx
│   ├── login/
│   │   └── LoginPage.tsx
│   ├── dashboard/
│   │   └── DashboardPage.tsx
│   └── admin/
│       └── config/
│           ├── ConfigPage.tsx
│           ├── configModules.ts
│           └── sections/
│               ├── ConfigEnv.tsx
│               ├── ConfigVimeo.tsx
│               ├── ConfigLti.tsx
│               └── ConfigLrs.tsx
├── routes/               # Configuração de rotas (react-router-dom)
│   └── index.tsx
├── styles/               # CSS global e tokens
│   ├── tokens.css        # Variáveis de design (cores, espaçamentos, etc.)
│   ├── utilities.css     # Classes utilitárias (.flex, .gap-md, etc.)
│   └── themes.css        # Temas (dark/light)
├── types/                # TypeScript types compartilhados
│   ├── vitrine.ts
│   └── config.ts
├── App.tsx               # Componente raiz
└── main.tsx              # Entry point (ReactDOM.render)
```

---

## Onde Colocar Cada Coisa

| O que                         | Onde                       | Exemplo                          |
|-------------------------------|----------------------------|----------------------------------|
| Componente UI base            | `components/ui/`           | `Button.tsx`, `Modal.tsx`        |
| Componente específico de app  | `components/app/`          | Tabelas, cards, formulários      |
| Hook reutilizável             | `hooks/`                   | `useToast.tsx`                   |
| Função de formatação          | `lib/formatters.ts`        | `formatDate`, `formatDuration`   |
| Constantes/mapas compartilhados| `lib/constants.ts`         | `STATUS_OPTIONS`, `TYPE_LABELS`  |
| Funções de URLs               | `lib/urls.ts`              | `buildPlayerUrl`                 |
| Funções de download           | `lib/download.ts`          | `downloadFile`, `getExportFilename` |
| Funções de storage            | `lib/storage.ts`           | `saveToStorage`, `loadFromStorage` |
| Função slugify                | `lib/slugify.ts`           | `slugify`                        |
| Página/rota                   | `pages/<nome-da-rota>/`    | `pages/vitrines/`                |
| Layout compartilhado          | `layouts/`                 | `AppLayout.tsx`                  |
| Cliente API                   | `api/`                     | `apiGet`, `apiPost`              |
| Tipos TypeScript              | `types/`                   | `Vitrine`, `ConfigStatus`        |
| CSS global/tokens             | `styles/`                  | `tokens.css`, `themes.css`       |

---

## Como Criar uma Nova Página

1. **Crie a pasta da página** em `pages/<nome>/`:
   ```
   pages/minha-pagina/
   └── MinhaPaginaPage.tsx
   ```

2. **Estrutura básica** (template):
   ```tsx
   import React from "react";
   import { Button, Card } from "../../components/ui";
   import { useToast } from "../../hooks/useToast";

   export function MinhaPaginaPage() {
     const toast = useToast();

     return (
       <div style={{ maxWidth: 900 }}>
         <h1>Minha Página</h1>
         <Card plain className="card-padding">
           <p>Conteúdo aqui.</p>
         </Card>
       </div>
     );
   }
   ```

3. **Registre a rota** em `routes/index.tsx`:
   ```tsx
   import { MinhaPaginaPage } from "../pages/minha-pagina/MinhaPaginaPage";
   // ...
   <Route path="/minha-pagina" element={<MinhaPaginaPage />} />
   ```

4. **Importe helpers via barrel export**:
   ```tsx
   import { formatDate, buildPlayerUrl, downloadFile, STATUS_OPTIONS } from "../../lib";
   ```

---

## Como Usar os Componentes UI

### Button

```tsx
import { Button } from "../../components/ui";

<Button onClick={handleClick}>Clique aqui</Button>
<Button variant="secondary" size="sm">Secundário pequeno</Button>
<Button variant="danger" disabled={loading}>Apagar</Button>
```

**Props:**
- `variant`: `"primary"` | `"secondary"` | `"danger"` | `"ghost"`
- `size`: `"sm"` | `"md"` (default)
- `disabled`: boolean

---

### Badge

```tsx
import { Badge } from "../../components/ui";

<Badge variant="success">Ativo</Badge>
<Badge variant="error">Erro</Badge>
<Badge variant="info">Em progresso</Badge>
```

**Props:**
- `variant`: `"neutral"` | `"info"` | `"success"` | `"warning"` | `"error"`

---

### Modal

```tsx
import { Modal, Button } from "../../components/ui";

const [open, setOpen] = useState(false);

<Modal
  open={open}
  onClose={() => setOpen(false)}
  title="Confirmar ação"
  footer={
    <>
      <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
      <Button onClick={handleConfirm}>Confirmar</Button>
    </>
  }
>
  <p>Tem certeza que deseja continuar?</p>
</Modal>
```

---

### Toast (Notificações)

```tsx
import { useToast } from "../../hooks/useToast";
import { ToastContainer } from "../../components/ui";

export function MinhaPagina() {
  const toast = useToast();

  return (
    <>
      <ToastContainer toasts={toast.toasts} onRemove={toast.remove} />
      <Button onClick={() => toast.success("Operação concluída!")}>
        Mostrar toast
      </Button>
    </>
  );
}
```

**Métodos:**
- `toast.success(message)`
- `toast.error(message)`
- `toast.warning(message)`
- `toast.info(message)`

---

### Card

```tsx
import { Card } from "../../components/ui";

<Card plain className="card-padding">
  <h2>Título do card</h2>
  <p>Conteúdo aqui.</p>
</Card>
```

---

### Input e Field

```tsx
import { Input, Field } from "../../components/ui";

const [value, setValue] = useState("");

<Field label="Nome">
  <Input
    value={value}
    onChange={setValue}
    placeholder="Digite seu nome"
  />
</Field>
```

---

## Convenções de Nomenclatura

| Tipo                  | Formato          | Exemplo                      |
|-----------------------|------------------|------------------------------|
| Componente React      | PascalCase       | `Button.tsx`, `VitrineCard`  |
| Página                | PascalCase + `Page` | `HomePage.tsx`            |
| Hook customizado      | camelCase + `use`  | `useToast.tsx`             |
| Função utilitária     | camelCase        | `formatDate.ts`              |
| Arquivo de constantes | camelCase        | `constants.ts`               |
| CSS (classes)         | kebab-case       | `.card-padding`, `.muted`    |

---

## Boas Práticas

1. **Use componentes UI base** em vez de criar botões/inputs customizados
2. **Extraia constantes e helpers** para `lib/` se forem usados em mais de uma página
3. **Use barrel exports**: `import { X } from "../../lib"` em vez de `import { X } from "../../lib/formatters"`
4. **Mantenha páginas simples**: lógica complexa deve estar em hooks ou services
5. **Use TypeScript**: sempre defina tipos explícitos para props e estados
6. **Evite CSS inline** quando possível: prefira classes utilitárias ou tokens CSS
7. **Toast para feedback**: sempre notifique o usuário após ações (sucesso/erro)
8. **Loading states**: mostre skeletons ou spinners durante carregamento assíncrono
9. **Componentes específicos**: se um componente é usado em 2+ páginas, mova para `components/app/`
10. **Helpers reutilizáveis**: URLs, downloads, slugs → sempre em `lib/` com tipos TypeScript

---

## Biblioteca de Helpers (`lib/`)

### Formatters (`lib/formatters.ts`)

Funções para formatação de dados:

```tsx
import { formatDate, formatDuration } from "../../lib";

formatDate("2024-02-15T14:30:00Z"); // "15/02/2024 14:30"
formatDuration(185); // "3:05"
formatDuration(null); // "—"
```

### URLs (`lib/urls.ts`)

Funções para construir URLs do player e downloads:

```tsx
import { buildPlayerUrl, buildDownloadUrl } from "../../lib";
import { PUBLIC_BASE_URL, API_BASE } from "../../api";

// URL do player (com slug ou fallback para vitrine_id)
const playerUrl = buildPlayerUrl(vitrineId, vitrine?.slug, PUBLIC_BASE_URL);
// Se slug existe: https://exemplo.com/p/minha-vitrine
// Senão: https://exemplo.com/player/index.html?vitrine_id=123

// URL de download
const downloadUrl = buildDownloadUrl(job.downloadUrl, API_BASE);
```

### Download (`lib/download.ts`)

Funções para download de arquivos autenticados:

```tsx
import { downloadFile, getExportFilename } from "../../lib";
import { getAuthToken, API_BASE } from "../../api";

// Download com autenticação
const url = `${API_BASE}${job.downloadUrl}`;
const token = getAuthToken();
const filename = getExportFilename(job.type, job.title);
await downloadFile(url, filename, token);
```

### Storage (`lib/storage.ts`)

Helpers para localStorage com JSON:

```tsx
import { saveToStorage, loadFromStorage, removeFromStorage } from "../../lib";

// Salvar objeto
saveToStorage("user-prefs", { theme: "dark", lang: "pt" });

// Carregar com fallback
const prefs = loadFromStorage("user-prefs", { theme: "light", lang: "pt" });

// Remover
removeFromStorage("user-prefs");
```

### Slugify (`lib/slugify.ts`)

Converte texto em slug URL-friendly:

```tsx
import { slugify } from "../../lib";

slugify("Minha Vitrine 2024!"); // "minha-vitrine-2024"
slugify("Acentuação & Símbolos"); // "acentuacao-simbolos"
```

### Constants (`lib/constants.ts`)

Constantes compartilhadas entre páginas:

```tsx
import { STATUS_OPTIONS, STATUS_LABELS, TYPE_LABELS, STATUS_BADGE_VARIANT } from "../../lib";

// Para select/dropdown de status de vitrine
<select>
  {STATUS_OPTIONS.map(opt => (
    <option key={opt.value} value={opt.value}>{opt.label}</option>
  ))}
</select>

// Para exibir label legível de status de job
<p>{STATUS_LABELS[job.status]}</p> // "Na fila", "Concluído", etc.

// Para tipo de export
<p>{TYPE_LABELS[job.type]}</p> // "SCORM 1.2", "HTML"

// Para variante de badge por status
<Badge variant={STATUS_BADGE_VARIANT[job.status]}>{STATUS_LABELS[job.status]}</Badge>
```

---

## Referências de CSS

### Tokens (variáveis)

Definidos em `styles/tokens.css`:

- Cores: `--color-primary`, `--color-error`, `--color-success`, `--text`, `--text-muted`
- Espaçamentos: `--spacing-sm`, `--spacing-md`, `--spacing-lg`
- Bordas: `--radius`, `--border`

### Classes utilitárias

Definidas em `styles/utilities.css`:

- Layout: `.flex`, `.flex-wrap`, `.flex-between`, `.gap-md`, `.items-center`
- Texto: `.muted`, `.text-center`
- Espaçamento: `.mb-md`, `.mt-lg`, `.py-md`

### Uso:

```tsx
<div className="flex gap-md items-center">
  <span className="muted">Status:</span>
  <Badge variant="success">Ativo</Badge>
</div>
```

---

## Temas (Dark/Light)

O sistema de temas usa CSS variables e React Context:

```tsx
import { useTheme } from "../contexts/ThemeContext";

const { theme, toggleTheme } = useTheme();

<Button onClick={toggleTheme}>
  {theme === "dark" ? "Modo claro" : "Modo escuro"}
</Button>
```

Tokens de cor se adaptam automaticamente ao tema.

---

## Troubleshooting

### Erro de import não encontrado

- Verifique se o caminho relativo está correto
- Use barrel exports quando disponível: `import { Button } from "../../components/ui"`

### Componente não aparece estilizado

- Certifique-se de que `styles/tokens.css`, `utilities.css` e `themes.css` estão importados em `main.tsx` ou `App.tsx`
- Verifique se a classe CSS está escrita corretamente

### TypeScript reclama de tipos

- Importe os tipos de `api/index.ts` ou `types/`
- Se o tipo não existe, crie em `types/` e documente aqui

---

**Dúvidas?** Consulte os componentes existentes em `components/ui/` como referência.
