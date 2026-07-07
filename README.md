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
- **Backup automático recorrente**: snapshot diário (banco + mirror) só quando algo muda, com retenção em camadas (diário/semanal/mensal) e restore assistido — ver seção própria abaixo.
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
pnpm test        # 74 testes (shared + server + web)
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

## Backup automático (snapshots recorrentes)

Todo dia às 3h (configurável), o servidor verifica se algo mudou desde o último snapshot e, se sim, gera um `.zip` (banco + `mirror/`) em `backups/` — pasta separada do `data/` ativo. Sem mudanças, não gera arquivo (evita snapshots redundantes).

**Retenção em camadas (avô-pai-filho):**
- Últimos **7 dias**: mantém todos os snapshots diários.
- **8 semanas seguintes**: mantém 1 por semana.
- **Daí em diante**: mantém 1 por mês, para sempre.

Espaço estimado: irrelevante para notas em texto puro — mesmo com uso intenso, poucas centenas de MB no total, mesmo depois de anos de uso.

**Configuração** (`.env`, ver `.env.example`):
```
Z_NOTES_BACKUP_DIR=            # default: ./backups
Z_NOTES_BACKUP_CRON=0 3 * * *  # default: diário às 3h
Z_NOTES_BACKUP_WEBHOOK_URL=    # opcional; POST em caso de falha
```

**Disparar manualmente** (sem esperar o cron): `POST /api/admin/backup-now`.

**Restaurar um snapshot** (com o servidor **parado**):
```bash
pnpm --filter @z-notes/server restore backups/2026-07-06T03-00-00-000Z.zip
```
Pede confirmação (digite "restaurar"), preserva o estado atual em `data/.pre-restore-backup-<timestamp>/` antes de sobrescrever, e avisa quando reiniciar o servidor. Use `--yes` para pular a confirmação em scripts.
