FROM node:20-alpine AS build

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

# config.js para runtime (pode ser sobrescrito via volume)
COPY studio/web/public/config.js /usr/share/nginx/html/config.js

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

