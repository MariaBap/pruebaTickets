# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Interfaz de CrazySupportHub (React + Vite), servida por nginx.
#
# Vite incrusta las variables VITE_* en el bundle durante la construcción, no
# al arrancar: por eso la URL de la API entra como argumento de build y no como
# variable de entorno del contenedor.
# ---------------------------------------------------------------------------
FROM node:24-slim AS build

WORKDIR /repo

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json

RUN npm ci --workspace frontend --include-workspace-root --foreground-scripts

COPY frontend/ frontend/

# La consume el navegador del host, así que apunta a localhost y no al nombre
# del servicio dentro de la red de Docker.
ARG VITE_API_URL=http://localhost:3000/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build -w frontend


# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

COPY --from=build /repo/frontend/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
