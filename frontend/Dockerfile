# syntax=docker/dockerfile:1

# ---------- build: gera os arquivos estáticos do dashboard ----------
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vazio = a API é chamada no mesmo domínio (/api/...), via proxy do Caddy.
ARG VITE_API_URL=""
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# ---------- runtime: Caddy serve o dashboard, faz proxy da API e cuida do HTTPS ----------
FROM caddy:2-alpine AS runtime

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv

EXPOSE 80 443
