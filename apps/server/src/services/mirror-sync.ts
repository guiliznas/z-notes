import path from "node:path";
import { and, eq, isNull, isNotNull, asc, ne } from "drizzle-orm";
import { deriveTitle } from "@z-notes/shared";
import type { AppContext } from "../context.js";
import { folders, notes, type NoteRow } from "../db/schema.js";
import {
  slugify,
  sanitizeSegment,
  renderNoteFile,
  writeFile,
  removeFile,
  clearMirror,
  type MirrorNoteData,
} from "../mirror/mirror.js";

/** Segmentos de diretório (pasta raiz [, subpasta]) para uma pasta. */
function folderSegments(ctx: AppContext, folderId: number): string[] {
  const segments: string[] = [];
  let current: number | null = folderId;
  const guard = new Set<number>();
  while (current !== null && !guard.has(current)) {
    guard.add(current);
    const folder = ctx.db.select().from(folders).where(eq(folders.id, current)).get();
    if (!folder) break;
    segments.unshift(sanitizeSegment(folder.name));
    current = folder.parentId;
  }
  return segments;
}

function slugFromPath(relPath: string): string {
  return path.basename(relPath, ".md");
}

/** Slugs já ocupados por outras notas ativas na mesma pasta. */
function takenSlugs(ctx: AppContext, folderId: number, exceptId: number): Set<string> {
  const rows = ctx.db
    .select({ mirrorPath: notes.mirrorPath })
    .from(notes)
    .where(and(eq(notes.folderId, folderId), isNull(notes.deletedAt), ne(notes.id, exceptId)))
    .all();
  const set = new Set<string>();
  for (const r of rows) {
    if (r.mirrorPath) set.add(slugFromPath(r.mirrorPath));
  }
  return set;
}

function makeUnique(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

function toMirrorData(row: NoteRow): MirrorNoteData {
  return {
    id: row.id,
    contentMd: row.contentMd,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    archived: row.archivedAt !== null,
  };
}

function computeRelPath(ctx: AppContext, row: NoteRow): string {
  const segments = folderSegments(ctx, row.folderId!);
  const base = slugify(deriveTitle(row.contentMd));
  const slug = makeUnique(base, takenSlugs(ctx, row.folderId!, row.id));
  return [...segments, `${slug}.md`].join("/");
}

/** Sincroniza o arquivo .md de uma nota: escreve, move ou remove conforme o estado. */
export function syncNoteMirror(ctx: AppContext, noteId: number): void {
  const row = ctx.db.select().from(notes).where(eq(notes.id, noteId)).get();
  if (!row) return;

  // Notas na lixeira ou órfãs saem do espelho.
  if (row.deletedAt !== null || row.folderId === null) {
    if (row.mirrorPath) {
      removeFile(ctx.cfg.mirrorDir, row.mirrorPath);
      ctx.db.update(notes).set({ mirrorPath: null }).where(eq(notes.id, noteId)).run();
    }
    return;
  }

  const relPath = computeRelPath(ctx, row);
  if (row.mirrorPath && row.mirrorPath !== relPath) {
    removeFile(ctx.cfg.mirrorDir, row.mirrorPath);
  }
  writeFile(ctx.cfg.mirrorDir, relPath, renderNoteFile(toMirrorData(row)));
  if (row.mirrorPath !== relPath) {
    ctx.db.update(notes).set({ mirrorPath: relPath }).where(eq(notes.id, noteId)).run();
  }
}

/** Regenera todo o espelho a partir do banco (recuperação / mudança de pastas). */
export function rebuildMirror(ctx: AppContext): void {
  clearMirror(ctx.cfg.mirrorDir);
  ctx.db.update(notes).set({ mirrorPath: null }).run();
  const active = ctx.db
    .select()
    .from(notes)
    .where(and(isNull(notes.deletedAt), isNotNull(notes.folderId)))
    .orderBy(asc(notes.id))
    .all();
  for (const row of active) {
    const relPath = computeRelPath(ctx, row);
    writeFile(ctx.cfg.mirrorDir, relPath, renderNoteFile(toMirrorData(row)));
    ctx.db.update(notes).set({ mirrorPath: relPath }).where(eq(notes.id, row.id)).run();
  }
}
