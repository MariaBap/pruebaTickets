# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# API de CrazySupportHub (NestJS + Prisma).
# El contexto de construcción es la raíz del repositorio, porque el backend es
# un workspace de npm y necesita el package-lock.json compartido.
#
# Se usa la variante Debian slim y no Alpine a propósito: bcrypt y los motores
# de Prisma distribuyen binarios precompilados para glibc, y en Alpine (musl)
# habría que compilarlos desde el código.
# ---------------------------------------------------------------------------
FROM node:24-slim AS build

WORKDIR /repo

# Prisma necesita openssl para hablar con Postgres.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Primero solo los manifiestos: mientras no cambien, Docker reutiliza la capa
# de dependencias aunque cambie el código.
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json

# Se instala solo el workspace del backend, con la raíz para resolver el lock.
# `allow-scripts` es necesario para que los motores de Prisma se preparen:
# npm 11 bloquea los scripts de instalación por defecto.
RUN npm ci --workspace backend --include-workspace-root --foreground-scripts \
    && npm rebuild bcrypt

COPY backend/ backend/
COPY tickets-seed.json ./

RUN npm run prisma:generate -w backend \
    && npm run build -w backend


# ---------------------------------------------------------------------------
FROM node:24-slim AS runtime

WORKDIR /repo

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

# Se copian también las dependencias de desarrollo: el arranque ejecuta las
# migraciones y el seed, que necesitan el CLI de Prisma y tsx.
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/package.json ./package.json
COPY --from=build /repo/tickets-seed.json ./tickets-seed.json
COPY --from=build /repo/backend ./backend

WORKDIR /repo/backend

EXPOSE 3000

# Migraciones y seed antes de servir. `migrate deploy` aplica las migraciones
# ya creadas y nunca genera ninguna nueva, que es lo correcto fuera de
# desarrollo. El seed es idempotente: borra y reinserta.
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && node dist/main.js"]
