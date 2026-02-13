# UniCV Studio (VPS)

Este diretório contém a aplicação para **gerenciar vitrines/vídeos**, **integrar com Vimeo (OAuth)** e **exportar** (HTML/SCORM/iframe) + **LTI/xAPI**. Para a documentação do **Player** (HTML/JS/SCORM na raiz), veja [DOCUMENTACAO.md](../DOCUMENTACAO.md). Para deploy em produção, veja [DEPLOY.md](DEPLOY.md).

## Stack escolhida

- **API**: Fastify + TypeScript + Prisma + Postgres (`studio/api`)
- **Painel**: (próximo passo) app web separada em `studio/web` (React), para manter o backend (OAuth/LTI/export) bem isolado.

## Rodar localmente (requer Node + npm)

1. Copie e ajuste as variáveis:

   - `studio/api/.env.example` → `studio/api/.env`

2. Suba um Postgres (ou use o da VPS) e ajuste `DATABASE_URL`.

3. Instale dependências e rode a API:

```bash
npm install
npm --workspace studio/api run prisma:generate
npm --workspace studio/api run prisma:migrate
npm --workspace studio/api run dev
```

Painel web:

```bash
npm --workspace studio/web run dev
```

## Endpoints (MVP)

- `GET /health`
- `GET /v1/playlist?showcase_id=...` (compatível com o player atual; substitui o n8n quando a vitrine existir no banco)
- `GET /auth/vimeo/start` + `GET /auth/vimeo/callback` (OAuth)
- `GET /v1/vimeo/showcases` (lista vitrines do Vimeo)
- `POST /v1/vimeo/showcases/:id/import` (importa showcase → vitrine local)
- `GET /v1/vimeo/status` (status da conexão)
- `GET /lti/config` (ajuda de configuração LTI no Moodle)
- `GET /lti/.well-known/jwks.json` (JWKS do tool)
- `GET /lti/login` + `POST /lti/launch` (LTI 1.3 básico)
- `POST /v1/xapi/statements` (proxy para LRS; opcional)

## LTI 1.3 (Moodle) — mínimo funcional

- Configure as variáveis `LTI_PLATFORM_*` no backend (`studio/api/.env`).\n- No Moodle, configure o external tool com:\n  - **Initiate login URL**: `https://SUA-VPS/lti/login`\n  - **Redirection URI(s)**: `https://SUA-VPS/lti/launch`\n  - **JWKS URL**: `https://SUA-VPS/lti/.well-known/jwks.json`\n- No link/atividade, adicione **custom parameter** `vitrine_id=<ID_DA_VITRINE>` (recomendado) ou `showcase_id=<ID_DO_SHOWCASE>`.\n\n> Observação: este é um MVP para rodar hospedado; dá para evoluir depois com Deep Linking e múltiplos deployments.

