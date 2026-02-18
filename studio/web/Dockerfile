# Build do web em monorepo. Requer contexto na raiz do repo.
# Use: docker build -f studio/web/Dockerfile .  (contexto = raiz)
FROM node:20-alpine AS build

ARG VITE_API_BASE_URL=
ARG VITE_PUBLIC_BASE_URL=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_PUBLIC_BASE_URL=$VITE_PUBLIC_BASE_URL

WORKDIR /app
COPY package.json package-lock.json ./
COPY studio/ studio/
RUN npm ci --include=dev
RUN npm --workspace studio/web run build


FROM nginx:alpine AS runtime

COPY --from=build /app/studio/web/dist/ /usr/share/nginx/html/

# config.js base (entrypoint sobrescreve com vars Coolify SERVICE_URL_*)
COPY studio/web/public/config.js /usr/share/nginx/html/config.js
COPY studio/web/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]

