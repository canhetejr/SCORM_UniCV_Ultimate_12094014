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
FROM node:20-alpine AS web-build
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

FROM nginx:alpine AS web
COPY --from=web-build /app/studio/web/dist/ /usr/share/nginx/html/
COPY studio/web/public/config.js /usr/share/nginx/html/config.js
COPY studio/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
