import { deriveTitle, deriveExcerpt } from "@z-notes/shared";
import type { SearchHit } from "@z-notes/shared";
import type { AppContext } from "../context.js";

interface FtsRow {
  id: number;
  folder_id: number | null;
  content_md: string;
  archived_at: number | null;
  created_at: number;
  updated_at: number;
  snip: string;
}

const RESULT_LIMIT = 50;

/** Busca full-text (FTS5). Sem folderId = global. Nunca inclui a lixeira. */
export function searchNotes(ctx: AppContext, query: string, folderId?: number | null): SearchHit[] {
  const match = buildMatchExpression(query);
  if (!match) return [];

  const params: (string | number)[] = [match];
  let sql = `
    SELECT n.id, n.folder_id, n.content_md, n.archived_at, n.created_at, n.updated_at,
           snippet(notes_fts, 0, '[', ']', '…', 12) AS snip
    FROM notes_fts
    JOIN notes n ON n.id = notes_fts.rowid
    WHERE notes_fts MATCH ? AND n.deleted_at IS NULL`;
  if (folderId !== undefined && folderId !== null) {
    sql += ` AND n.folder_id = ?`;
    params.push(folderId);
  }
  sql += ` ORDER BY rank LIMIT ${RESULT_LIMIT}`;

  const rows = ctx.sqlite.prepare(sql).all(...params) as FtsRow[];
  return rows.map((r) => ({
    note: {
      id: r.id,
      folderId: r.folder_id,
      title: deriveTitle(r.content_md),
      excerpt: deriveExcerpt(r.content_md),
      archived: r.archived_at !== null,
      deleted: false,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    },
    snippet: r.snip,
  }));
}

/** Converte o texto do usuário em uma expressão MATCH segura (prefixo por termo, AND implícito). */
function buildMatchExpression(query: string): string {
  const terms = query
    .trim()
    .split(/\s+/)
    .map((t) => t.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);
  if (terms.length === 0) return "";
  return terms.map((t) => `"${t}"*`).join(" ");
}
