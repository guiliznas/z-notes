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
CMD ["pnpm", "--filter", "@z-notes/server", "start"]
