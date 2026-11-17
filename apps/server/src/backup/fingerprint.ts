import type { AppContext } from "../context.js";

interface CountAndMax {
  count: number;
  maxUpdated: number;
}

interface NotesState extends CountAndMax {
  versionSum: number;
  pinnedSum: number;
}

/**
 * Estado opaco do banco para detectar mudança desde o último backup.
 * COUNT(*) cobre criação/exclusão definitiva (a linha some sem bater timestamp
 * em nenhuma remanescente); MAX(updated_at) cobre edição/mover/arquivar/lixeira/restaurar.
 * SUM(version) das notas complementa updated_at: version é um contador inteiro
 * incrementado a cada update, imune a colisões de resolução de relógio (ms).
 * Fixar/desafixar não mexe em updated_at nem em version (para não gerar conflito no editor
 * aberto), então SUM(pinned_at) entra à parte para o backup enxergar essa mudança.
 */
export function computeFingerprint(ctx: AppContext): string {
  const notes = notesState(ctx);
  const folders = countAndMax(ctx, "folders");
  return `${notes.maxUpdated}:${notes.count}:${notes.versionSum}:${notes.pinnedSum}:${folders.maxUpdated}:${folders.count}:${tasksState(ctx)}:${inboxState(ctx)}:${tokensState(ctx)}`;
}

function notesState(ctx: AppContext): NotesState {
  return ctx.sqlite
    .prepare(
      `SELECT COUNT(*) AS count, COALESCE(MAX(updated_at), 0) AS maxUpdated, COALESCE(SUM(version), 0) AS versionSum, COALESCE(SUM(pinned_at), 0) AS pinnedSum FROM notes`,
    )
    .get() as NotesState;
}

function countAndMax(ctx: AppContext, table: "folders"): CountAndMax {
  const row = ctx.sqlite
    .prepare(`SELECT COUNT(*) AS count, COALESCE(MAX(updated_at), 0) AS maxUpdated FROM ${table}`)
    .get() as CountAndMax;
  return row;
}

/**
 * Pastas, listas e tarefas: COUNT + MAX(updated_at) de cada tabela, mais somas que cobrem o que pode
 * mudar sem bater o relógio da mesma forma (posição ao reordenar, arquivar, concluir).
 */
function tasksState(ctx: AppContext): string {
  const row = ctx.sqlite
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM task_folders) AS fc,
         (SELECT COALESCE(MAX(updated_at), 0) FROM task_folders) AS fm,
         (SELECT COALESCE(SUM(position) + SUM(COALESCE(archived_at, 0)), 0) FROM task_folders) AS fs,
         (SELECT COUNT(*) FROM task_lists) AS lc,
         (SELECT COALESCE(MAX(updated_at), 0) FROM task_lists) AS lm,
         (SELECT COALESCE(SUM(position) + SUM(COALESCE(archived_at, 0)), 0) FROM task_lists) AS ls,
         (SELECT COUNT(*) FROM tasks) AS tc,
         (SELECT COALESCE(MAX(updated_at), 0) FROM tasks) AS tm,
         (SELECT COALESCE(SUM(position) + SUM(COALESCE(archived_at, 0)) + SUM(COALESCE(done_at, 0)) + SUM(LENGTH(content_md)), 0) FROM tasks) AS ts`,
    )
    .get() as Record<string, number>;
  return `${row.fc}.${row.fm}.${row.fs}:${row.lc}.${row.lm}.${row.ls}:${row.tc}.${row.tm}.${row.ts}`;
}

/**
 * Itens do inbox: COUNT + MAX(updated_at) + soma de archived_at.
 */
function inboxState(ctx: AppContext): string {
  const row = ctx.sqlite
    .prepare(
      `SELECT
         COUNT(*) AS count,
         COALESCE(MAX(updated_at), 0) AS maxUpdated,
         COALESCE(SUM(COALESCE(archived_at, 0)), 0) AS archivedSum
       FROM inbox_items`,
    )
    .get() as { count: number; maxUpdated: number; archivedSum: number };
  return `${row.count}.${row.maxUpdated}.${row.archivedSum}`;
}

/**
 * Tokens de API: COUNT + MAX(created_at) + soma de revoked_at.
 * last_used_at é propositalmente omitido para evitar snapshots a cada requisição externa.
 */
function tokensState(ctx: AppContext): string {
  const row = ctx.sqlite
    .prepare(
      `SELECT
         COUNT(*) AS count,
         COALESCE(MAX(created_at), 0) AS maxCreated,
         COALESCE(SUM(COALESCE(revoked_at, 0)), 0) AS revokedSum
       FROM api_tokens`,
    )
    .get() as { count: number; maxCreated: number; revokedSum: number };
  return `${row.count}.${row.maxCreated}.${row.revokedSum}`;
}
