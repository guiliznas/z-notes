# CLAUDE.md

Contexto para trabalhar neste repositório com Claude Code. Para visão de produto, features e como rodar, ver [`README.md`](README.md). Para as decisões de design originais, ver `docs/superpowers/specs/`:
- `2026-07-06-z-notes-design.md` — app completo (3 colunas, espelho `.md`, offline)
- `2026-07-06-backup-recorrente-design.md` — backup automático (retenção GFS, restore)
- `2026-07-07-multi-usuario-google-design.md` — multi-usuário com login Google (planejamento, ainda não iniciado)
- `ROADMAP.md` — prioridades vigentes (P0 login Google + isolamento, P1 mobile)

## Workflow obrigatório: worktree por tarefa

Toda tarefa (feature, fix, refactor, spike) roda em worktree limpa, nunca no checkout principal.

```bash
mkdir -p ~/ai-tmp
git worktree add ~/ai-tmp/<nome-da-tarefa> -b <tipo>/<nome-da-tarefa>
cd ~/ai-tmp/<nome-da-tarefa>
pnpm install
```

Ao finalizar (merge ou descarte): remover a worktree e limpar o branch se descartado.

```bash
cd /home/guiliznas/services/z-notes
git worktree remove ~/ai-tmp/<nome-da-tarefa> --force
git worktree prune
```

Regras: um diretório por tarefa em `~/ai-tmp/`; nunca commitar dentro de `~/ai-tmp/` esperando que reflita no checkout principal sem push/PR; nunca deixar worktree abandonada — toda tarefa termina com `worktree remove + prune`.

## Estado atual (2026-09-14)

- `main`: backend Fastify + SQLite single-tenant (senha única compartilhada, sessão fixa `"authenticated"`), web 3 colunas, backup recorrente. Testes/pipeline verdes.
- `feat/mobile-desktop` (não mergeada): app mobile Expo/RN (`apps/mobile`, login + lista + detalhe + markdown) e shell desktop Tauri (`apps/desktop`). Base para a discussão mobile na ROADMAP.
- `feat/task-list-checkboxes` (não mergeada): preview markdown interativo com checkboxes.
- Auth atual não isola nada: notas/pastas globais, sem coluna de dono. Qualquer multi-usuário real exige o P0 da ROADMAP antes de qualquer app mobile multi-usuário.

## Estrutura

Monorepo pnpm workspaces:

```
apps/web/      React 19 + Vite + Tailwind 4 + TanStack Query (persistência offline via IndexedDB)
apps/server/   Fastify 5 + Drizzle ORM + better-sqlite3 (SQLite + FTS5)
packages/shared/  Tipos e helpers puros compartilhados entre web e server
```

## Comandos

```bash
pnpm install
pnpm dev          # server :8787 + web :5173 (proxy /api)
pnpm test         # 75 testes (shared + server + web)
pnpm typecheck
pnpm build
```

Rodar só um pacote: `pnpm --filter @z-notes/server test`, `pnpm --filter @z-notes/web typecheck`, etc.

## Convenções específicas deste repo

- **Título da nota = primeira linha do conteúdo.** Não existe campo `title` separado — sempre derive via `deriveTitle()` (`packages/shared`), nunca duplique essa lógica.
- **O espelho `.md` (`data/mirror/`) é somente-leitura** (write-through do banco → arquivo). O SQLite é sempre a fonte da verdade; nunca escreva lógica que lê o mirror para reconstituir estado.
- **Pastas: no máximo 1 nível de aninhamento.** Validado em `apps/server/src/services/folders.ts`. A UI (sidebar, mover nota, import) assume esse limite — não remover a checagem sem atualizar os três lugares.
- **Testes de serviço** usam `makeTestCtx()` (sem HTTP, direto nos services). **Testes de rota** usam `makeTestApp()` (via `app.inject`, com cookie de sessão já autenticado). Ambos em `apps/server/src/test-helpers.ts`.
- **Fingerprint de mudança do backup** (`backup/fingerprint.ts`) combina `MAX(updated_at)` + `COUNT(*)` + `SUM(version)` das notas — o `SUM(version)` existe especificamente para não depender só de timestamp (colisão de resolução de relógio em operações rápidas). Não simplificar removendo essa parte.

## Gotchas descobertos (não reintroduzir)

1. **Nunca inicie o servidor de produção via `pnpm run start` / `pnpm --filter ... start`.** O `pnpm` não repassa `SIGTERM` de forma confiável ao processo Node filho — `docker stop` mata o processo sem deixar o SQLite fechar a conexão (WAL nunca é "checkpointado"), arriscando perda de dados ou reaplicação de transações antigas num restore. Por isso o `Dockerfile` chama `node_modules/.bin/tsx src/index.ts` diretamente. Verificado empiricamente com `docker build` + `docker stop` real (ver commit `3dfc148`).

2. **`Z_NOTES_SESSION_SECRET` vazio é aceito silenciosamente — ainda não mitigado.** Se a variável não estiver definida no `.env` usado pelo `docker-compose.yml`, o Compose a substitui por string vazia (não `undefined`), e `process.env.Z_NOTES_SESSION_SECRET ?? DEFAULT_SECRET` em `config.ts` não cai no default nesse caso (`??` só cobre `null`/`undefined`, não `""`). Resultado: cookies de sessão assinados com segredo vazio, sem nenhum aviso no log (diferente da senha, que já tem esse aviso em `index.ts`). **TODO:** replicar o padrão de aviso/recusa da senha para o segredo de sessão antes de expor o servidor publicamente.

3. **Restore de snapshot precisa limpar os sidecars `-wal`/`-shm`** do banco anterior (`backup/restore.ts`). Se deixados no lugar, uma transação não "checkpointada" do banco antigo pode ser reaplicada por cima do banco recém-restaurado, revertendo silenciosamente a restauração. Já corrigido — não remover essa limpeza num refactor futuro.

## Deploy

- Remote: https://github.com/guiliznas/z-notes (público)
- Produção via Docker Compose (container único, API + build do web). Pensado para rodar atrás de **Cloudflare Tunnel**: o TLS termina no Cloudflare, o container serve HTTP puro internamente. O cookie `Secure` funciona normalmente porque é avaliado pela conexão navegador↔Cloudflare (HTTPS), não pela conexão Cloudflare↔origem.
