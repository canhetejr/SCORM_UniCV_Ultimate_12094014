# Multi-target Dockerfile para Coolify: evita que o build do web use o Dockerfile da api.
# Uso: docker build --target api .  ou  docker build --target web .

# ---------- API ----------
FROM node:20-alpine AS api-build
WORKDIR /app
COPY studio/api/package.json studio/api/package.json
COPY studio/api/tsconfig.json studio/api/tsconfig.json
COPY studio/api/prisma studio/api/prisma
COPY studio/api/src studio/api/src
WORKDIR /app/studio/api
RUN npm install
RUN npm run prisma:generate
RUN npm run build

FROM node:20-alpine AS api
RUN apk --no-cache add curl
WORKDIR /app/studio/api
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001
COPY --from=api-build /app/studio/api/package.json ./package.json
COPY --from=api-build /app/studio/api/node_modules ./node_modules
COPY --from=api-build /app/studio/api/dist ./dist
COPY --from=api-build /app/studio/api/prisma ./prisma
COPY index.html /app/index.html
COPY imsmanifest.xml /app/imsmanifest.xml
COPY style.css /app/style.css
COPY scorm.js /app/scorm.js
COPY css /app/css
COPY js /app/js
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]

# ---------- WEB ----------
# Build a partir da raiz do monorepo (workspaces) com devDependencies (vite, typescript).
# NODE_ENV=production no Coolify faria npm install omitir devDeps -> build falharia.
FROM node:20-alpine AS web-build
ARG VITE_API_BASE_URL=
ARG VITE_PUBLIC_BASE_URL=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_PUBLIC_BASE_URL=$VITE_PUBLIC_BASE_URL
WORKDIR /app
COPY package.json package-lock.json ./
COPY studio/ studio/
RUN npm ci --include=dev
RUN npm --workspace studio/web run build

FROM nginx:alpine AS web
COPY --from=web-build /app/studio/web/dist/ /usr/share/nginx/html/
COPY studio/web/public/config.js /usr/share/nginx/html/config.js
COPY studio/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY studio/web/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]
