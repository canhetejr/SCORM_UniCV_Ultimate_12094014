# Multi-target Dockerfile para Coolify: evita que o build do web use o Dockerfile da api.
# Uso: docker build --target api -f infra/docker/Dockerfile .  (contexto = raiz do repo)
# Build: contexto na raiz do repositório para a API e web terem acesso a apps/* e packages/player.

# ---------- API ----------
FROM node:20-alpine AS api-build
WORKDIR /app
COPY apps/api/package.json apps/api/package.json
COPY apps/api/tsconfig.json apps/api/tsconfig.json
COPY apps/api/prisma apps/api/prisma
COPY apps/api/src apps/api/src
WORKDIR /app/apps/api
RUN npm install --legacy-peer-deps --no-audit --no-fund --loglevel=info
RUN npm run prisma:generate
RUN npm run build

FROM node:20-alpine AS api
RUN apk --no-cache add curl
WORKDIR /app/apps/api
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001
COPY --from=api-build /app/apps/api/package.json ./package.json
COPY --from=api-build /app/apps/api/node_modules ./node_modules
COPY --from=api-build /app/apps/api/dist ./dist
COPY --from=api-build /app/apps/api/prisma ./prisma
# Player assets: API resolve packages/player via getRepoRoot() (path absoluto no container)
COPY packages/player /app/packages/player
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]

# ---------- WEB ----------
# Build apenas apps/web (sem depender de package-lock.json na raiz)
FROM node:20-alpine AS web-build
ARG VITE_API_BASE_URL=
ARG VITE_PUBLIC_BASE_URL=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_PUBLIC_BASE_URL=$VITE_PUBLIC_BASE_URL
WORKDIR /app/apps/web
COPY apps/web/package.json apps/web/tsconfig.json apps/web/vite.config.ts apps/web/index.html ./
COPY apps/web/src ./src
COPY apps/web/public ./public
RUN npm install --legacy-peer-deps --no-audit --no-fund --loglevel=info
RUN npm run build

FROM nginx:alpine AS web
COPY --from=web-build /app/apps/web/dist/ /usr/share/nginx/html/
COPY apps/web/public/config.js /usr/share/nginx/html/config.js
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY apps/web/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]
