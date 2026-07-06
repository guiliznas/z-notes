# z-notes

App de notas pessoal estilo Apple Notes: três colunas (pastas → notas → editor markdown), web responsivo, com backup contínuo em arquivos `.md` para integração fácil com IA/scripts.

Design completo em [`docs/superpowers/specs/2026-07-06-z-notes-design.md`](docs/superpowers/specs/2026-07-06-z-notes-design.md).

## Recursos

- **Três colunas** responsivas: desktop (3 colunas) → tablet (2 colunas + drawer) → mobile (drill-down).
- **Pastas com subpastas** (1 nível), contador de notas, arquivar, lixeira (sem purga automática).
- **Editor markdown** de texto puro (título = primeira linha) com **autosave** e resolução de conflito por versão.
- **Busca full-text** (SQLite FTS5) com destaque.
- **Espelho `.md`**: cada nota é gravada como arquivo `.md` com frontmatter em `data/mirror/<Pasta>/…` — pronto para `git`, `rsync` ou apontar uma IA direto na pasta.
- **Import** de `.md`/`.zip` e **export** do backup em `.zip`.
- **Offline leve**: cache de leitura persistido (IndexedDB) + autosave que fica em fila e sincroniza ao reconectar.

## Stack

Monorepo pnpm — React + Vite + Tailwind (`apps/web`), Fastify + Drizzle + SQLite (`apps/server`), tipos compartilhados (`packages/shared`).

## Desenvolvimento

```bash
pnpm install
cp .env.example .env      # ajuste Z_NOTES_PASSWORD
pnpm dev                  # server em :8787, web (Vite) em :5173 com proxy /api
```

Testes e checagens:

```bash
pnpm test        # 51 testes (shared + server + web)
pnpm typecheck
pnpm build       # builda web + valida tipos do server
```

## Produção (Docker)

```bash
# Gere o hash da senha:
pnpm --filter @z-notes/server hash "sua-senha-forte"

# .env na raiz:
#   Z_NOTES_PASSWORD_HASH=<hash gerado acima>
#   Z_NOTES_SESSION_SECRET=<segredo aleatório>

docker compose up -d --build
# App em http://localhost:8787 (coloque atrás de um proxy HTTPS no VPS)
```

Um único container serve a API e o build do web. `data/` (SQLite + espelho `.md`) é um volume persistente — **backup = copiar `data/`**.

## Backup e IA

O espelho fica em `data/mirror/`, espelhando a estrutura de pastas com um `.md` por nota (frontmatter com `id`, `created`, `updated`, `archived`). É somente-leitura (a fonte da verdade é o SQLite); para trazer conteúdo externo, use o **Importar** na UI. Para regenerar o espelho a partir do banco: `POST /api/admin/rebuild-mirror`.
