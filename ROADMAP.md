# ROADMAP — z-notes

Prioridades vigentes (2026-09-14). Detalhe de implementação do P0 em
`docs/superpowers/specs/2026-07-07-multi-usuario-google-design.md`.

## P0 — Login com Google + notas individuais isoladas

**Problema:** hoje o backend é single-tenant (senha única compartilhada,
sessão fixa `"authenticated"`). Notas/pastas são globais, sem coluna de dono —
qualquer pessoa autenticada enxerga tudo.

**Objetivo:** cada pessoa loga com Google e enxerga **apenas o próprio
ambiente**, sem possibilidade de acessar notas de outra pessoa (nem via ID
direto — sem IDOR).

**Escopo:**
1. Identidade: tabela `users`, OAuth Google server-side (`@fastify/oauth2`),
   sessão passa a carregar `userId`. Remove senha única.
2. Isolamento de dados: coluna `userId` em `notes`/`folders`, filtro por dono
   em **todas** as queries (services + FTS raw), `userId` em todo `insert`.
3. Migração: `ALTER TABLE` idempotente + backfill das linhas existentes para o
   admin (primeiro e-mail da allowlist), com snapshot de backup antes.
4. Artefatos: espelho `.md` por usuário (`<mirrorDir>/<userId>/...`), cache
   offline do web namespaced por usuário + limpeza no logout.
5. Acesso: allowlist de e-mails (`Z_NOTES_ALLOWED_EMAILS`), fail-safe.
6. Testes: isolamento (A não lê/edita/deleta de B → 404), allowlist (403),
   migração/backfill, mirror por usuário.

**Pré-requisito fora do código:** credenciais OAuth no Google Cloud Console
com redirect URI para `/api/auth/google/callback`.

**Verificação:** login ponta a ponta, `GET /api/notes/<id-do-outro>` → 404,
mirror separado por usuário, B não vê nada de A no mesmo navegador, backup
global continua funcionando.

## P1 — App mobile (React Native / Expo)

**Problema:** hoje só existe web responsivo (drill-down no mobile). Falta um
app instalável.

**Decisão consolidada:** continuar no **React Native / Expo** já existente
em `apps/mobile` (aproveitando os 69 testes unitários, os componentes de telas
e o compartilhamento direto de tipos e regras com `@z-notes/shared`).
Plano detalhado documentado em `plan/app-mobile.md`.

**Estado atual:** `apps/mobile` já possui autenticação por Bearer token via
SecureStore, lista e detalhe com visualização Markdown, e testes cobrindo
hooks, storage e chamadas de API.

**Pré-requisito para multi-usuário:** P0 pronto antes de qualquer versão
multi-usuário final — o app poderá autenticar via Google e consumir a API
já isolada por usuário (embora possa operar com a autenticação atual por senha/token
durante o desenvolvimento).

**Escopo:** navegação completa (pastas, arquivadas, lixeira), busca global FTS,
editor markdown com autosave debounced, offline-first resiliente (cache persistido +
fila de mutações), tela de configurações/logout e build do APK Android via EAS.

**Verificação:** instalar APK no Android, CRUD + busca + pastas + offline funcionando,
testes unitários verdes.
