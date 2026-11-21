# Desenvolvimento do z-notes

Registro de como, onde e com quê o projeto foi desenvolvido. Reconstruído em 2026-11-16 a partir do
histórico git, das issues/PRs do GitHub e das sessões do Claude Code. Complementa o
[`README.md`](README.md) (produto), o [`CLAUDE.md`](CLAUDE.md) (regras para o agente) e o
[`ROADMAP.md`](ROADMAP.md) (estado e pendências).

> Fatos abaixo vieram de comandos (`git log`, `gh`, leitura de arquivos e das sessões). O que é
> inferência está marcado como **Hipótese**.

## 1. Onde o desenvolvimento aconteceu

- **Conta do Claude Code: pessoal.** As sessões do projeto estão em
  `~/.claude-pessoal/projects/-home-guiliznas-services-z-notes/`. A conta de trabalho (`~/.claude`)
  só tem a sessão de 2026-11-16, em que se reconstruiu este histórico.
- **Checkout principal:** `~/services/z-notes` (`main`). Há também uma worktree do Orca em
  `~/orca/workspaces/z-notes/surgeonfish` (branch `guiliznas/surgeonfish`).
- **Worktrees por tarefa:** `~/ai-tmp/<tarefa>/` (regra do `CLAUDE.md`). Em 2026-11-16 existiam
  `tasks-board` (`feat/tasks-board`) e `sidebar-nested-button` (`fix/sidebar-nested-button`), além
  de uma pasta `issues2` que não é worktree do git.
- **Remoto:** <https://github.com/guiliznas/z-notes> (público).
- **Produção:** <https://notes.o.ziltro.dev> (VPS Oracle + Dokploy, ver seção 5).
- **Paperclip: nenhuma relação.** A instância local do Paperclip (`~/services/paperclip`,
  workspaces `biblescroll`, `pace-calculator`, `monitoria`) não tem projeto z-notes, e as sessões
  que citam os dois só os listam lado a lado (`docker ps`, `ls`, `tmux`). Nenhum agente do
  Paperclip mexeu no código.

### Sessões do Claude Code (conta pessoal)

| Sessão | Data | Conteúdo |
|---|---|---|
| `42b188ff` | 2026-10-27 | "consegue ler o que temos aqui no projeto?" |
| `0f4d867e` | 2026-10-27 | nomeada "z-notes"; levantamento do que estava planejado |
| `227a6076` | 2026-10-27 a 2026-11-05 | sessão principal (12 MB): apps, deploy, rate limit, Fixadas, redesign, tarefas, inbox |
| `ebfec31c` | data não verificada | projeto `...z-notes--claude-worktrees-docs-deploy-oracle-dokploy` (migração para a Oracle) |

Memória relacionada: `~/.claude-pessoal/projects/-home-guiliznas/memory/oracle_vps_dokploy.md`.

## 2. Linha do tempo (65 commits em `main`)

| Data | Marco |
|---|---|
| 2026-07-06 | Spec de design; scaffold do monorepo; backend Fastify + SQLite + espelho `.md`; frontend React de 3 colunas |
| 2026-07-07 | Backup automático recorrente (snapshots, restore); `CLAUDE.md`; spec de multi-usuário com login Google |
| 2026-07-08 | Apps desktop (Tauri) e mobile (Expo) + CI (`ci.yml`); testes mobile (67 vitest) e desktop (3 cargo) |
| 2026-07-09 | Checkboxes de tarefa no preview markdown |
| 2026-09-14 | **Login Google + isolamento por usuário** (#5); mobile em 6 fases (navegação, busca FTS, editor, offline-first, configurações, EAS build) |
| 2026-09-15 | Métricas + dashboard admin (#7); ícones e **PWA instalável** (#9, #10); identidade teal/âmbar; guia de deploy |
| 2026-09-16 | PWA com `autoUpdate`; ajustes de tema escuro; task list checkboxes mergeada (#2) |
| 2026-09-26 | Apps desktop/mobile mergeados (#1); fix de crash do Hermes (Expo 57) |
| 2026-10-27 | JWT por deep link nos apps (#11, #12); CI do APK; deploy Dokploy (#16); rate limit (#18); release só com instaladores desktop (#17); **notas fixadas + redesign estilo Simplenote** (#22) |
| 2026-10-28 | Quadro de **Tarefas** (PR #24 aberto); fix do botão aninhado na sidebar (PR #23 aberto) |
| 2026-11-03 a 11-05 | Planejamento da **Inbox / captura rápida** (epic #25, issues #26 a #32) |

PRs: #1, #2, #5, #7, #9, #10, #11, #12, #13, #16, #17, #18, #22 mergeados; **#14, #23 e #24 abertos**.

## 3. Decisões e o porquê (ditas pelo usuário nas sessões)

- **Apps:** desktop só Linux (Tauri), mobile só Android (Expo/RN). Foco no desktop primeiro; o mobile
  fica para depois, usando o web responsivo/PWA enquanto isso (2026-10-27).
- **Referência visual:** Simplenote (lista limpa, editor sem ruído); funcionalidades seguem as do z-notes.
- **Cadastro aberto:** qualquer pessoa pode entrar com Google. A lista de e-mails em
  `Z_NOTES_ADMIN_EMAILS` serve só para marcar quem é admin. Proteção: rate limit no login e na API,
  com `trustProxy` configurável (#18).
- **Editor:** abre sempre em visualização; duplo clique edita. Nada é lembrado no `localStorage`.
- **Fixadas:** pasta virtual no início da lista, para ter "o que estou fazendo agora" independente de
  organizar por projeto/área.
- **Tarefas:** seção separada, com pastas → listas em colunas (estilo Google Tarefas) → tarefas.
  Arquivar/restaurar, concluídas visíveis, gatilho na lista para arquivar todas as concluídas.
  Protótipo aprovado antes de implementar (`.claude/design-tasks`).
- **Inbox (planejada):** página nova como a Fixadas, em formato de chat; mensagem triada com destino
  sai da Inbox. Uma tarefa pode ser "uma nota por trás dos panos" (issue #29 estuda isso).
- **Prototipar antes de implementar** design/UX (`.claude/design-proto`, `.claude/design-tasks`).
- **Produção como teste:** sem outros usuários, o usuário aceitou testar direto em produção
  (2026-11-03). Dokploy tem "preview deployments", mas não foi configurado (**não verificado**).
- **Dúvidas levantadas e sem decisão registrada:** atualização remota do app desktop e
  Flatpak × AppImage (2026-10-27).

## 4. Arquitetura (resumo; detalhes no `CLAUDE.md`)

Monorepo pnpm: `apps/web` (React 19, Vite, Tailwind 4, TanStack Query, IndexedDB), `apps/server`
(Fastify 5, Drizzle, better-sqlite3 + FTS5), `apps/mobile` (Expo), `apps/desktop` (Tauri),
`packages/shared`. SQLite é a fonte da verdade; o espelho `.md` por usuário é só leitura.
Specs originais em `docs/superpowers/specs/`; planos de trabalho (git-ignorados) em `plan/`.

## 5. Deploy e operação

- **Manual:** `docs/deploy.md` (Docker Compose, atrás de Cloudflare Tunnel).
- **Produção atual:** Dokploy na VPS Oracle `ziltro-world` (aarch64, 2 vCPU, 11 GiB, Docker Swarm).
  App `z-notes`, build do `Dockerfile` pela branch `main`, 1 réplica stop-first, volumes
  `z-notes-data` e `z-notes-backups`, healthcheck `/api/health`. Migração feita em 2026-10-27; o
  z-notes local (`:8787`) rodou em paralelo e as notas **não sincronizam** entre os dois. Detalhes:
  `docs/deploy-dokploy.md`.
- **Backup:** snapshots no volume + cópia diária para o Cloudflare R2 (retenção 7 diários + 6
  mensais), restore testado em 2026-10-27. Runbook: `docs/backup-restore.md`. Credenciais R2 ficam
  fora do repo, em `~/.config/cloudflare-r2/z-notes.env`.
- **Monitoramento:** monitor "Z-Notes" no Uptime Kuma; alerta de backups no zion-2 (cron 09:00,
  Telegram).
- **Segredos:** `GOOGLE_CLIENT_ID/SECRET/CALLBACK_URL` e `Z_NOTES_SESSION_SECRET` (obrigatório em
  produção). O usuário decidiu **não** rotacionar a API key `Paperclip` do Dokploy nem o secret do R2.
- **CI:** `.github/workflows/ci.yml` (testes + typecheck em push/PR, build do APK e instaladores
  desktop). Na 2026-10-27 o PR #16 foi mergeado com admin merge porque o check "Build mobile APK"
  falhava.

## 6. Estado em 2026-11-16 e pendências

**Código não mergeado:**

| Item | Onde |
|---|---|
| Tarefas (pastas, listas, arrastar) | PR #24, branch `feat/tasks-board`, 4 commits |
| Botão aninhado na sidebar | PR #23, branch `fix/sidebar-nested-button` |
| Login Google no mobile pelo navegador | PR #14, branch `feat/mobile-google-login` |

**Issues abertas:** #4 (app mobile), #15 (tarefas), #19 (fechar porta 3000 do Dokploy), #20 (2FA no
Dokploy), #21 (cópia dos backups na NAS), #25 a #32 (Inbox e captura rápida: modelo/API, página tipo
chat, triagem, conteúdo de tarefa, Web Share Target no Android, atalho no desktop, token para iOS
Atalhos/Tasker).

**Validação em dispositivo real** (não automatizável, do `ROADMAP.md`): APK via EAS, `.deb`/AppImage
do CI com deep link `znotes://auth`, React Navigation no mobile, cache offline por usuário, PWA no
iOS e em modo avião.

## 7. Como retomar

1. `cd ~/services/z-notes && git fetch && git branch -a` e `gh pr list` / `gh issue list`.
2. Confira o `ROADMAP.md` e este arquivo contra o GitHub; o GitHub é a fonte da verdade.
3. Siga o workflow do `CLAUDE.md` (worktree em `~/ai-tmp/<tarefa>` e `node` 22 via mise).
4. Para reler o raciocínio de uma decisão, procure nas sessões pessoais citadas na seção 1
   (`grep -i <termo> ~/.claude-pessoal/projects/-home-guiliznas-services-z-notes/*.jsonl`).
