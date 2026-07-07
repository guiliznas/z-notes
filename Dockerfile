# Estágio de build: instala deps (compila better-sqlite3) e builda o web.
FROM node:22-slim AS build
RUN corepack enable && apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build

# Estágio de runtime: reaproveita node_modules (com binário nativo já compilado).
FROM node:22-slim AS runtime
RUN corepack enable
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
EXPOSE 8787
WORKDIR /app/apps/server
# Invoca o tsx diretamente (não via "pnpm run start"): o pnpm não repassa SIGTERM
# ao processo filho de forma confiável, o que impediria o shutdown gracioso
# (checkpoint do WAL do SQLite) em `docker stop`.
CMD ["node_modules/.bin/tsx", "src/index.ts"]
