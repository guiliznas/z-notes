# Multi-usuário com login Google no z-notes

> Planejamento de implementação. Ainda não iniciado — decisões de design nos padrões recomendados (ajustáveis antes de codar).

## Context

Hoje o z-notes é **single-tenant**: uma senha única compartilhada, cookie de sessão com valor fixo `"authenticated"` (sem identidade), e todas as notas/pastas são globais (nenhuma coluna de dono). O objetivo é abrir o app para outras pessoas — cada uma logando **com Google** e enxergando **apenas o próprio ambiente**.

Isso exige três mudanças estruturais que se sustentam mutuamente:
1. **Identidade** — tabela `users`, login OAuth Google, sessão que carrega o `userId`.
2. **Isolamento de dados** — coluna `userId` em `notes`/`folders` e filtro por dono em *todas* as queries (senão qualquer usuário acessa notas de outro via ID — IDOR).
3. **Isolamento de artefatos em disco** — espelho `.md` por usuário; cache offline do frontend isolado por usuário.

**Decisões adotadas** (padrões recomendados; ajustáveis):
- **Acesso:** allowlist de e-mails via env var `Z_NOTES_ALLOWED_EMAILS` (CSV). Só e-mails listados logam; os demais recebem 403. Se vazia → nega todos em produção (fail-safe).
- **Dados atuais:** migração atribui todas as notas/pastas existentes ao primeiro e-mail da allowlist (você = admin).
- **Login:** **apenas Google**. Remove a senha única (tela e rotas). O cookie de sessão assinado continua sendo o mecanismo — só o conteúdo muda (passa a conter `userId`).

## Abordagem

### Backend — identidade e sessão

**Fluxo OAuth (Authorization Code, server-side):** usar `@fastify/oauth2` (nova dep) apontando para o Google. Encaixa no modelo atual de cookie de sessão — nenhum token trafega/é manipulado no frontend.

- Novas envs em `apps/server/src/config.ts` (`AppConfig` + `configFromEnv`): `googleClientId`, `googleClientSecret`, `googleCallbackUrl`, `allowedEmails: string[]`. Remover `passwordHash`/`resolvePasswordHash`. Aplicar ao `sessionSecret` o mesmo tratamento de recusa/aviso que hoje falta (gotcha #2 do CLAUDE.md: `""` não cai no `??`) — validar cedo no boot.
- Novas rotas em `apps/server/src/routes/auth.ts`:
  - `GET /api/auth/google` — inicia o redirect (o plugin gera a URL de consentimento).
  - `GET /api/auth/google/callback` — troca o code por tokens, busca o perfil (`email`, `name`, `picture`), **valida contra a allowlist** (403 se fora), faz upsert do usuário (`upsertUserByEmail`), grava a sessão e redireciona para `/`.
  - `POST /api/auth/logout` — mantém (limpa cookie).
  - `GET /api/auth/me` — passa a retornar `{ authenticated, user?: { id, email, name, avatarUrl } }` em vez de só `{ authenticated }`.
  - Remover `POST /api/auth/login` e `LoginSchema`.
- `apps/server/src/auth/session.ts`: o cookie deixa de ser o literal `"authenticated"` e passa a conter o `userId` (assinado). Trocar `verifyPassword` por helpers `setSessionCookie(reply, userId, isProd)` / `readUserId(request): number | null`. `requireAuth` passa a **resolver o usuário** e anexá-lo ao request. Novo módulo `apps/server/src/auth/users.ts` com `upsertUserByEmail`, `getUserById`.

### Backend — propagar o `userId` e isolar queries

O ponto de menor atrito, dado que todo service já recebe `ctx: AppContext`: **derivar um ctx por-request** com o `userId` embutido, em vez do ctx global único de `apps/server/src/app.ts:19`.

- Adicionar `userId: number` a `AppContext` (`apps/server/src/context.ts`). Manter um "base ctx" (`{ db, sqlite, cfg }`) e, no `preHandler` de auth (`apps/server/src/routes/index.ts`), após resolver a sessão, anexar `req.appCtx = { ...baseCtx, userId }`. As rotas passam a usar `req.appCtx` em vez do ctx capturado no closure. (Alternativa mais verbosa: passar `userId` como parâmetro a cada função — evitada por tocar centenas de call-sites.)
- **Adicionar filtro por dono em todas as queries** — trocar cada `eq(notes.id, id)` / `eq(folders.id, id)` por `and(eq(...id), eq(...userId, ctx.userId))`, e injetar `userId` em todo `insert`. Arquivos:
  - `apps/server/src/services/notes.ts` — `getNoteRow`, `buildListFilters`, `createNote`, `updateNote`, `trashNote`, `restoreNote`, `hardDeleteNote`, `fallbackFolderId`.
  - `apps/server/src/services/folders.ts` — `getFolderRow`, `listFolderTree`, `activeNoteCounts`, `createFolder`, `updateFolder`, `deleteFolder`, `assertValidParent`, `hasChildren`, `maxPosition`.
  - `apps/server/src/services/mirror-sync.ts` — `rebuildMirror` (hoje faz `update(notes).set(...)` **sem where** — escopar por usuário) e `takenSlugs`/`folderSegments`.
  - `apps/server/src/services/io.ts` — `importEntries`, `ensureFolder`/`ensurePath`, `exportZip`.
  - `apps/server/src/routes/search.ts` (SQL raw FTS) — adicionar `AND n.user_id = ?` no WHERE do JOIN. A tabela `notes_fts` **não muda** (o escopo vem do join com `notes`). Ver convenção do repo sobre não duplicar lógica.
- A regra de "máximo 1 nível de aninhamento" (`folders.ts`) permanece — passa a valer por usuário.

### Backend — schema e migração

- `apps/server/src/db/schema.ts`: nova tabela `users` (`id`, `email` unique, `name`, `avatarUrl`, `createdAt`, `updatedAt`); adicionar `userId` (FK → `users.id`, notNull) em `folders` e `notes`.
- `apps/server/src/db/bootstrap.ts`: o DDL é `CREATE TABLE IF NOT EXISTS` — **não migra bases existentes**. Adicionar uma etapa de migração idempotente em `openDatabase()`:
  - `CREATE TABLE IF NOT EXISTS users (...)`.
  - Detectar colunas ausentes via `PRAGMA table_info(notes|folders)`; se faltar `user_id`, rodar `ALTER TABLE ... ADD COLUMN user_id INTEGER REFERENCES users(id)`.
  - **Backfill:** se houver linhas com `user_id IS NULL`, criar/pegar o usuário admin (primeiro e-mail da allowlist) e `UPDATE ... SET user_id = <admin>`. Exige passar a allowlist/config para `openDatabase` (hoje recebe só `dbPath`).
  - Novos índices: `idx_notes_user`, `idx_folders_user`; ajustar `idx_notes_folder`/`idx_notes_updated` para compostos com `user_id` se necessário.
  - **Fazer snapshot de backup antes de rodar a migração destrutiva** (reusar `createSnapshotIfChanged` de `apps/server/src/backup/snapshot.ts`).

### Backend — espelho `.md` e backup

- **Mirror por usuário:** prefixar o path base por usuário — `<mirrorDir>/<userId>/...` — para evitar colisão entre notas de usuários diferentes com mesma pasta/título. Ajustar `computeRelPath`/`syncNoteMirror`/`rebuildMirror` (`mirror-sync.ts`) e o `removeFile` em `hardDeleteNote`. **Cuidado:** `clearMirror` apaga o dir inteiro — em rebuild por usuário, limpar só o subdir do usuário.
- **Backup:** manter **global** (snapshot do banco inteiro + mirror inteiro). O `fingerprint.ts` já agrega o banco todo; nenhuma mudança necessária. Preservar o `SUM(version)` no fingerprint (convenção do repo) e a limpeza de `-wal`/`-shm` no restore (gotcha #3).

### Frontend

- **`apps/web/src/api/resources.ts`:** remover `authLogin`; `authMe` passa a tipar `{ authenticated, user? }`. Adicionar helper que redireciona para `/api/auth/google` (o browser navega; não é `fetch`).
- **`apps/web/src/auth/AuthContext.tsx`:** expor `user` (id, email, name, avatar) além de `status`. `login()` deixa de receber senha e vira "entrar com Google" (redirect).
- **`apps/web/src/components/LoginPage.tsx`:** trocar o formulário de senha por um botão "Entrar com Google" que dispara o redirect. O callback OAuth volta para `/` já autenticado; o gate condicional em `App.tsx` continua funcionando (sem necessidade de rota pública nova no front, pois o callback é server-side).
- **`apps/web/src/components/SidebarFooter.tsx`:** já tem o botão "Sair" e é o lugar natural — exibir avatar/nome/e-mail do usuário logado.
- **Isolamento do cache offline (crítico — risco de vazamento entre usuários):** hoje `apps/web/src/offline/queryClient.ts` usa `key: "z-notes-cache"` fixo e o `logout()` **não** limpa o cache. Duas medidas:
  1. Namespear a `key` do persister por `userId` (ou por e-mail) — ex. `z-notes-cache:<userId>`.
  2. No `logout()` (e ao detectar troca de usuário no `authMe`), chamar `queryClient.clear()` + remover a entrada do IndexedDB (`idb-keyval` `del`), incluindo as mutações de autosave persistidas (`UPDATE_NOTE_KEY`).

### Testes

- `apps/server/src/test-helpers.ts`: `makeConfig`/`makeTestCtx` precisam semear um usuário e injetar `userId` no ctx. `makeTestApp` (hoje faz `login()` com senha `"changeme"`) precisa de um atalho para sessão autenticada — ex. um helper que injeta o cookie de sessão assinado com um `userId` de teste, ou um bypass de OAuth em ambiente de teste.
- Novos testes: isolamento (usuário A não lê/edita/deleta nota de B → 404, não 403 vazando existência), allowlist (e-mail fora → 403 no callback), migração/backfill (base antiga ganha `user_id` do admin), mirror por usuário (sem colisão).

## Arquivos-chave a modificar

- Identidade/sessão: `apps/server/src/config.ts`, `apps/server/src/auth/session.ts`, novo `apps/server/src/auth/users.ts`, `apps/server/src/routes/auth.ts`, `apps/server/src/routes/index.ts`, `apps/server/src/app.ts`, `apps/server/src/context.ts`.
- Schema/migração: `apps/server/src/db/schema.ts`, `apps/server/src/db/bootstrap.ts`.
- Isolamento de dados: `apps/server/src/services/{notes,folders,mirror-sync,io}.ts`, `apps/server/src/routes/search.ts`.
- Frontend: `apps/web/src/api/resources.ts`, `apps/web/src/auth/AuthContext.tsx`, `apps/web/src/components/{LoginPage,SidebarFooter}.tsx`, `apps/web/src/offline/queryClient.ts`.
- Testes: `apps/server/src/test-helpers.ts` + novos specs.
- Deps: adicionar `@fastify/oauth2` no server; remover `bcryptjs`/`@types/bcryptjs` se a senha for de fato removida.
- Docs/infra: `docker-compose.yml`/`.env` (novas envs Google + allowlist), `README.md`, `CLAUDE.md` (atualizar gotcha #2 e documentar o modelo multi-usuário).

## Pré-requisito fora do código

Criar credenciais OAuth no Google Cloud Console (projeto → APIs & Services → Credentials → OAuth client ID, tipo "Web application"), configurando o **Authorized redirect URI** para `https://<seu-domínio>/api/auth/google/callback` (e `http://localhost:8787/...` em dev). Isso gera o `client id`/`client secret` que entram nas envs.

## Verificação

1. `pnpm typecheck` e `pnpm test` (com os test-helpers atualizados e os novos specs de isolamento/migração passando).
2. **Migração:** rodar o server contra uma cópia do banco atual e confirmar que as notas existentes ganham `user_id` do admin e continuam visíveis logando com esse e-mail.
3. **Fluxo OAuth ponta a ponta** (`pnpm dev`, credenciais de dev): clicar "Entrar com Google" → consentimento → volta autenticado; `GET /api/auth/me` retorna o `user`.
4. **Isolamento:** logar com dois e-mails diferentes (duas allowlist entries), criar notas em cada, confirmar que um não vê as do outro; tentar `GET /api/notes/<id-do-outro>` → 404. Verificar no disco que o mirror fica em `<mirrorDir>/<userId>/`.
5. **Allowlist:** tentar logar com e-mail fora da lista → 403, nenhum usuário criado.
6. **Cache offline:** logar como A, deslogar, logar como B na mesma máquina → B não vê nada de A (inspecionar IndexedDB `z-notes-cache:*`).
7. **Backup/restore** continua funcionando globalmente (`/api/admin/backup-now` + restore) sem corromper o isolamento.
