# syntax=docker/dockerfile:1

# ---------- build: compila o TypeScript e gera o Prisma Client ----------
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json ./
# O prisma.config.ts exige DATABASE_URL; no build ela não é usada para conectar.
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" npx prisma generate

COPY src ./src
RUN npm run build

# ---------- runtime: só dependências de produção + Prisma CLI para as migrations ----------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NPM_CONFIG_UPDATE_NOTIFIER=false

# Instala e roda tudo como o usuário sem privilégios "node".
RUN chown node:node /app
USER node

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts \
  && npm install --no-save --ignore-scripts \
     "prisma@$(node -p "require('./package-lock.json').packages['node_modules/prisma'].version")" \
  && npm cache clean --force

COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node prisma.config.ts ./
COPY --chown=node:node --chmod=755 docker-entrypoint.sh ./
# Garante quebras de linha LF mesmo se o arquivo vier do Windows com CRLF.
RUN sed -i 's/\r$//' docker-entrypoint.sh

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
