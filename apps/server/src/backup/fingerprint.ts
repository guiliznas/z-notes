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
  return `${notes.maxUpdated}:${notes.count}:${notes.versionSum}:${notes.pinnedSum}:${folders.maxUpdated}:${folders.count}`;
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
