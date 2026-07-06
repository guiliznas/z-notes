# z-notes — Design

App de notas pessoal estilo Apple Notes: layout em três colunas (pastas → notas → editor), editor markdown de texto puro (estilo Simplenote), web responsivo, com backup contínuo em arquivos `.md` para integração fácil com IA.

Data: 2026-07-06 · Status: aprovado em brainstorming

## Decisões de produto

| Tema | Decisão |
|---|---|
| Usuários | Single user com login simples (senha via env, sem cadastro) |
| Offline | Híbrido leve: cache de leitura persistido + fila de edições offline; sem sync engine completo |
| Hierarquia | Pastas com subpastas de **1 nível** de profundidade |
| Storage | SQLite como fonte da verdade + espelho `.md` write-through no disco |
| Espelho | **Somente leitura** (app → arquivos); conteúdo externo entra pela função de importar |
| Stack | React + Vite + Tailwind (web) · Node 22 + Fastify + Drizzle (server) · TypeScript em tudo |
| Deploy | Docker Compose em VPS próprio, container único, volume persistente |
| MVP extras | Busca global (FTS5), lixeira **sem purga automática**, arquivar notas |
| Fora do MVP | Pin de notas, preview renderizado de markdown, drag-and-drop, PWA/service worker, espelho bidirecional, multi-usuário |

## Arquitetura

Monorepo pnpm workspaces:

```
z-notes/
├── apps/
│   ├── web/          # React + Vite + Tailwind
│   └── server/       # Node 22 + Fastify + Drizzle ORM
├── packages/
│   └── shared/       # Types TS compartilhados (Note, Folder, DTOs)
├── data/             # gitignored; volume no Docker
│   ├── z-notes.db    # SQLite
│   └── mirror/       # espelho .md
└── docker-compose.yml
```

Em produção o server Node serve `/api/*` e os estáticos do build web — um único container, um único volume (`data/`).

### Auth

- Senha única definida por env var (armazenada como hash bcrypt).
- Login (`POST /api/auth/login`) cria sessão em cookie `httpOnly` + `Secure`.
- Rate limit no endpoint de login.

## Modelo de dados (SQLite)

```
folders:   id, name, parent_id (nullable), position, created_at, updated_at
           └─ regra: parent_id só pode apontar para pasta raiz (1 nível de aninhamento)

notes:     id, folder_id, content_md, version,
           archived_at (null = ativa), deleted_at (null = fora da lixeira),
           created_at, updated_at

notes_fts: tabela virtual FTS5 sobre o conteúdo (busca full-text)
```

- **Título da nota = primeira linha do conteúdo** (sem campo separado, estilo Simplenote).
- **Lixeira:** `deleted_at` preenchido → some das listas. **Sem purga automática** — exclusão definitiva só manual (item a item ou "esvaziar lixeira").
- **Arquivadas:** `archived_at` preenchido → some da lista padrão da pasta; visão dedicada "Arquivadas"; a busca global inclui arquivadas com badge. A lixeira nunca aparece na busca.
- **Excluir pasta com notas:** as notas vão para a lixeira e a pasta é apagada.
- `version` incrementa a cada gravação — usado para detecção de conflito no autosave.

## Espelho .md (write-through, somente leitura)

- Toda criação/edição/rename/move regrava `data/mirror/<Pasta>/<Subpasta>/<slug-do-título>.md`.
- Frontmatter YAML mínimo:

  ```markdown
  ---
  id: 42
  created: 2026-07-05T10:00:00Z
  updated: 2026-07-05T12:30:00Z
  archived: false
  ---
  Título da nota
  corpo da nota...
  ```

- Arquivadas **permanecem no espelho na pasta original** (frontmatter `archived: true`).
- Notas na lixeira **saem do espelho** (recuperáveis pelo app até exclusão definitiva).
- Colisão de slug: sufixo incremental (`titulo.md`, `titulo-2.md`).
- `POST /api/admin/rebuild-mirror` regenera o espelho inteiro a partir do banco.

## API REST

```
POST   /api/auth/login          # senha → cookie de sessão
POST   /api/auth/logout

GET    /api/folders             # árvore completa (raízes + filhos)
POST   /api/folders             # { name, parent_id? }
PATCH  /api/folders/:id         # rename / mover / reordenar
DELETE /api/folders/:id         # notas da pasta → lixeira; pasta apagada

GET    /api/notes?folder=:id    # lista da pasta (ativas)
GET    /api/notes?view=archived # arquivadas
GET    /api/notes?view=trash    # lixeira
GET    /api/notes/:id
POST   /api/notes               # { folder_id, content_md }
PATCH  /api/notes/:id           # conteúdo / mover / arquivar / desarquivar
DELETE /api/notes/:id           # → lixeira (deleted_at)
DELETE /api/notes/:id?hard=true # exclusão definitiva
POST   /api/notes/:id/restore   # tira da lixeira

GET    /api/search?q=...&folder=:id?  # FTS5, notas + trecho com highlight
                                      # sem folder = global (ativas + arquivadas); com folder = escopo da pasta
                                      # lixeira nunca entra na busca

POST   /api/import              # multipart: .md soltos ou .zip com pastas
GET    /api/export              # baixa .zip do espelho
POST   /api/admin/rebuild-mirror
```

- Listagens retornam metadados leves (id, título, trecho, `updated_at`); conteúdo completo só ao abrir a nota.
- Ordenação padrão: `updated_at` desc.

## Autosave e conflitos

- Debounce de ~800ms após parar de digitar → `PATCH /api/notes/:id` enviando `version`.
- Versão defasada (ex.: nota aberta em duas abas) → `409`; o client recarrega o conteúdo mais novo e avisa via toast. Last-write-wins, sem merge.
- Indicador discreto no editor: "Salvando… / Salvo".

## Híbrido offline (leve)

- **Leitura:** TanStack Query + `persistQueryClient` → cache (pastas, listas, notas abertas) persiste em IndexedDB; sem rede, o que já foi carregado continua legível.
- **Escrita:** mutações falhas por rede entram numa fila em IndexedDB (`{ noteId, content, baseVersion, timestamp }`); banner "offline — N alterações pendentes"; ao reconectar, replay em ordem, conflito resolvido por última escrita.
- Sem service worker no MVP — o app precisa estar aberto para uso offline. PWA fica para a fase mobile.

## Import / Export

- **Import (UI):** arquivos `.md` soltos ou `.zip`; estrutura de pastas do zip vira pastas/subpastas; níveis além do segundo são achatados no segundo nível. Frontmatter existente preserva datas; sem frontmatter, usa a data do import.
- **Export:** download de `.zip` do espelho.

## UI/UX

### Três colunas (desktop ≥ 1024px)

```
┌─ Pastas 240px ─┬─ Notas 320px ──┬─ Editor (flex) ────────┐
│ Todas as notas │ [buscar]       │ Título (1ª linha)      │
│ Trabalho     ▸ │ ────────────── │                        │
│   Reuniões     │ Nota A         │ corpo em markdown      │
│ Pessoal        │ 12:30 · trecho │ (textarea limpo,       │
│ ────────────── │ Nota B         │  sem toolbar)          │
│ Arquivadas     │ ontem · trecho │                        │
│ Lixeira        │                │                        │
│ [+ nova pasta] │ [+ nova nota]  │ "Salvo"      [⋯ menu]  │
└────────────────┴────────────────┴────────────────────────┘
```

- **Coluna 1:** visões fixas (Todas as notas, Arquivadas, Lixeira) + pastas com expand/collapse e contador de notas; rename/excluir via menu de contexto.
- **Coluna 2:** busca no topo (filtra a pasta atual; em "Todas" = busca global FTS); itens com título + trecho + data relativa.
- **Coluna 3:** editor de texto puro markdown; menu `⋯` com mover / arquivar / excluir.

### Responsividade

| Largura | Comportamento |
|---|---|
| ≥ 1024px | 3 colunas lado a lado |
| 640–1023px | 2 colunas (notas + editor); pastas em drawer deslizante |
| < 640px | Drill-down de 1 coluna: pastas → lista → editor, com voltar |

Navegação guiada por URL (React Router): `/folder/:id`, `/folder/:id/note/:id` — voltar do browser funciona e toda nota tem deep-link.

### Interações

- Mover nota entre pastas via menu `⋯` (drag-and-drop pós-MVP).
- Tema claro/escuro automático (`prefers-color-scheme`).
- Atalhos: `Ctrl+K` foca busca, `Ctrl+N` nova nota.

## Tratamento de erros

- Toast para erros de API; retry automático de queries.
- Banner fixo quando offline com contador de alterações pendentes.
- `409` de conflito → recarrega versão mais nova + toast explicando.

## Testes (`pnpm test`)

- **Server (Vitest):** CRUD de pastas/notas, regras de arquivar/lixeira, busca FTS, import (zip com estrutura, achatamento de níveis extras), export, escrita do espelho (slugs, colisões, rename), auth + rate limit.
- **Web (Vitest + Testing Library):** debounce do autosave, fila offline (enfileirar/replay), navegação responsiva por URL.
