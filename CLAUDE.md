# CLAUDE.md

Contexto para trabalhar neste repositório com Claude Code. Para visão de produto, features e como rodar, ver [`README.md`](README.md). Para as decisões de design originais, ver `docs/superpowers/specs/`:
- `2026-07-06-z-notes-design.md` — app completo (3 colunas, espelho `.md`, offline)
- `2026-07-06-backup-recorrente-design.md` — backup automático (retenção GFS, restore)
- `2026-07-07-multi-usuario-google-design.md` — multi-usuário com login Google (implementado na branch `feat/login-google`; OAuth manual via `fetch`, sem `@fastify/oauth2`)
- Issues GitHub: #3 (P0 login Google + isolamento), #4 (P1 app Flutter)

## Workflow obrigatório: worktree por tarefa

Toda tarefa (feature, fix, refactor, spike) roda em worktree limpa, nunca no checkout principal.

```bash
mkdir -p ~/ai-tmp
git worktree add ~/ai-tmp/<nome-da-tarefa> -b <tipo>/<nome-da-tarefa>
cd ~/ai-tmp/<nome-da-tarefa>
pnpm install --ignore-scripts   # ver gotcha #4 (better-sqlite3/Node)
```

Ao finalizar (merge ou descarte): remover a worktree.

```bash
cd /home/guiliznas/services/z-notes
git worktree remove ~/ai-tmp/<nome-da-tarefa> --force
git worktree prune
```

Regras: um diretório por tarefa em `~/ai-tmp/`; nunca deixar worktree abandonada — toda tarefa termina com `worktree remove + prune`.

## Estado atual (branch `feat/login-google`)

Login Google implementado, sem senha. Fluxo: tela só com botão Google → `GET /api/auth/google` → callback server-side (`GET /api/auth/google/callback`: valida `state`, troca code, userinfo, upsert, adota órfãs no primeiro login, set cookie, redirect `/`) → app com as notas do usuário.

- **Sessão:** cookie `z_session` assinado carrega o `userId` (nunca literal fixo). `GET /api/auth/me` → `{ authenticated, user? }`.
- **Ownership:** `preHandler` resolve `userId` (`requireAuth`, `routes/index.ts`) e rotas usam `reqCtx(ctx, req): RequestContext`. Todo service recebe `RequestContext` e filtra por `eq(userId)` — cross-access retorna **404, nunca 403** (não vazar existência). FTS tem `AND n.user_id = ?`.
- **Dados legados:** `user_id` NULL = era single-tenant; primeiro login adota tudo (`adoptOrphanData`, só quando há 1 usuário) e regenera o espelho.
- **Artefatos por usuário:** espelho em `<mirrorDir>/<userId>/` (`userMirrorDir()` em `config.ts`); cache IndexedDB `z-notes-cache:<userId>` com limpeza no logout (`AuthContext` + `clearUserCache`); QueryClient instanciado por usuário (`PerUserProvider`, `key={user.id}`).
- **Backup segue global** (banco inteiro + mirror inteiro). Migração gera snapshot de segurança via `createSnapshotIfChanged` no boot.
- Envs: `GOOGLE_CLIENT_ID/SECRET/CALLBACK_URL` (sem elas, `/google` → 503); `Z_NOTES_SESSION_SECRET` obrigatório em prod (fail-fast, gotcha #2 mitigado). `docker-compose.yml` usa `:?` para exigir o segredo.

## Estrutura

Monorepo pnpm workspaces:

```
apps/web/      React 19 + Vite + Tailwind 4 + TanStack Query (persistência offline via IndexedDB)
apps/server/   Fastify 5 + Drizzle ORM + better-sqlite3 (SQLite + FTS5)
packages/shared/  Tipos e helpers puros compartilhados entre web e server
```

## Comandos

```bash
export PATH="/home/guiliznas/.local/share/mise/installs/node/25.8.1/bin:$PATH"  # ver gotcha #4
pnpm install --ignore-scripts
pnpm test         # 115 testes (7 shared + 20 web + 88 server)
pnpm typecheck
pnpm build
```

Rodar só um pacote: `pnpm --filter @z-notes/server test`, `pnpm --filter @z-notes/web typecheck`, etc.

## Convenções específicas deste repo

- **Título da nota = primeira linha do conteúdo.** Não existe campo `title` separado — sempre derive via `deriveTitle()` (`packages/shared`), nunca duplique essa lógica.
- **O espelho `.md` (`data/mirror/<userId>/`) é somente-leitura** (write-through do banco → arquivo). O SQLite é sempre a fonte da verdade; nunca escreva lógica que lê o mirror para reconstituir estado.
- **Pastas: no máximo 1 nível de aninhamento.** Validado em `apps/server/src/services/folders.ts`. A UI (sidebar, mover nota, import) assume esse limite — não remover a checagem sem atualizar os três lugares.
- **Todo acesso a nota/pasta filtra pelo dono.** Ponto único: `getNoteRow`/`getFolderRow` com `owned()` (`and(eq(id), eq(userId))`); novas queries/services devem seguir o padrão e retornar 404 para recurso alheio. `rebuildMirror`/`clearMirror` só no subdir do usuário — nunca no mirror raiz.
- **Testes de serviço** usam `makeTestCtx()` (sem HTTP, direto nos services, com usuário semeado → `RequestContext`). **Testes de rota** usam `makeTestApp()` (via `app.inject`, login Google real com `fetch` mockado; `loginWithGoogle(app, profile)` para segundo usuário). Helpers `startOAuth`/`finishOAuth` para casos de state/erro. Ambos em `apps/server/src/test-helpers.ts`. `listMirror`/`readMirror` aceitam `userId` opcional.
- **Frontend:** `authMe` tipa `AuthMeResponse` (`packages/shared`); `LoginPage` só redireciona (`googleLoginUrl`); `logout()` sempre limpa o IndexedDB do usuário. Novos componentes com query devem ficar abaixo de `PerUserProvider`.
- **Fingerprint de mudança do backup** (`backup/fingerprint.ts`) combina `MAX(updated_at)` + `COUNT(*)` + `SUM(version)` das notas — o `SUM(version)` existe especificamente para não depender só de timestamp (colisão de resolução de relógio em operações rápidas). Não simplificar removendo essa parte.

## Gotchas descobertos (não reintroduzir)

1. **Nunca inicie o servidor de produção via `pnpm run start` / `pnpm --filter ... start`.** O `pnpm` não repassa `SIGTERM` de forma confiável ao processo Node filho — `docker stop` mata o processo sem deixar o SQLite fechar a conexão (WAL nunca é "checkpointado"), arriscando perda de dados ou reaplicação de transações antigas num restore. Por isso o `Dockerfile` chama `node_modules/.bin/tsx src/index.ts` diretamente. Verificado empiricamente com `docker build` + `docker stop` real (ver commit `3dfc148`).

2. **`Z_NOTES_SESSION_SECRET` vazio era aceito silenciosamente — MITIGADO no login Google.** Agora `resolveSessionSecret()` em `config.ts` recusa valor ausente/vazio em produção (throw no boot) e avisa em dev; `docker-compose.yml` usa `${VAR:?msg}`. Não reintroduzir `?? DEFAULT` silencioso.

3. **Restore de snapshot precisa limpar os sidecars `-wal`/`-shm`** do banco anterior (`backup/restore.ts`). Se deixados no lugar, uma transação não "checkpointada" do banco antigo pode ser reaplicada por cima do banco recém-restaurado, revertendo silenciosamente a restauração. Já corrigido — não remover essa limpeza num refactor futuro.

4. **better-sqlite3 só funciona no Node 25 (ABI 141) nesta máquina.** O binário pré-compilado foi feito para `NODE_MODULE_VERSION 141`; no Node 26 (147) os testes do server falham. Use sempre `export PATH="/home/guiliznas/.local/share/mise/installs/node/25.8.1/bin:$PATH"` antes de `pnpm`. Em worktree nova, `pnpm install --ignore-scripts` (o postinstall nativo falha) e copie o binário: `build/Release/better_sqlite3.node` do checkout principal para o mesmo caminho na worktree.

5. **Índices sobre `user_id` SÓ depois do `ALTER` na migração** (`db/bootstrap.ts`: `USER_INDEXES` após `migrateUserColumns`). Em banco legado a coluna ainda não existe quando o DDL roda — `CREATE INDEX` antes quebra o boot com `no such column`.

6. **Replay de callback é barrado pelo Google, não pelo state local.** HTTP é stateless: reenviar o cookie de state passa na verificação. A proteção real é o `code` de uso único (segunda troca → `invalid_grant` → 502, sem sessão). Teste cobre isso (`auth.test.ts`); não tentar "uso único" de state sem store server-side.

7. **`app.inject` corrompe binário em string.** Teste de conteúdo de zip deve chamar `exportZip()` no nível de serviço (Buffer direto); na rota, assert só status + headers.

## Deploy

- Remote: https://github.com/guiliznas/z-notes (público)
- Produção via Docker Compose (container único, API + build do web). Pensado para rodar atrás de **Cloudflare Tunnel**: o TLS termina no Cloudflare, o container serve HTTP puro internamente. O cookie `Secure` funciona normalmente porque é avaliado pela conexão navegador↔Cloudflare (HTTPS), não pela conexão Cloudflare↔origem.
- Antes de expor: criar OAuth client no Google Cloud Console com redirect `https://<domínio>/api/auth/google/callback` e preencher `GOOGLE_*` no `.env`.
