FROM node:20-alpine AS build

WORKDIR /app

COPY studio/api/package.json studio/api/package.json
COPY studio/api/tsconfig.json studio/api/tsconfig.json
COPY studio/api/prisma studio/api/prisma
COPY studio/api/src studio/api/src

WORKDIR /app/studio/api

RUN npm install
RUN npm run prisma:generate
RUN npm run build


FROM node:20-alpine AS runtime

RUN apk --no-cache add curl

WORKDIR /app/studio/api

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001

COPY --from=build /app/studio/api/package.json ./package.json
COPY --from=build /app/studio/api/node_modules ./node_modules
COPY --from=build /app/studio/api/dist ./dist
COPY --from=build /app/studio/api/prisma ./prisma

# O player/exporter usa templates do repo (index.html, imsmanifest.xml, css/, js/, etc.)
# No Coolify, a forma mais simples é buildar o repo todo como contexto.
COPY index.html /app/index.html
COPY imsmanifest.xml /app/imsmanifest.xml
COPY style.css /app/style.css
COPY scorm.js /app/scorm.js
COPY css /app/css
COPY js /app/js

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]

