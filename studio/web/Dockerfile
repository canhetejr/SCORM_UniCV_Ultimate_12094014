FROM node:20-alpine AS build

ARG VITE_API_BASE_URL=
ARG VITE_PUBLIC_BASE_URL=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_PUBLIC_BASE_URL=$VITE_PUBLIC_BASE_URL

WORKDIR /app
COPY studio/web/package.json studio/web/package.json
COPY studio/web/tsconfig.json studio/web/tsconfig.json
COPY studio/web/vite.config.ts studio/web/vite.config.ts
COPY studio/web/index.html studio/web/index.html
COPY studio/web/public studio/web/public
COPY studio/web/src studio/web/src

WORKDIR /app/studio/web
RUN npm install
RUN npm run build


FROM nginx:alpine AS runtime

COPY --from=build /app/studio/web/dist/ /usr/share/nginx/html/

# config.js base (entrypoint sobrescreve com vars Coolify SERVICE_URL_*)
COPY studio/web/public/config.js /usr/share/nginx/html/config.js
COPY studio/web/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]

