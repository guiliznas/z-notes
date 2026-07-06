import { and, eq, isNull, isNotNull, desc, asc } from "drizzle-orm";
import { deriveTitle, deriveExcerpt } from "@z-notes/shared";
import type { Note, NoteMeta, NoteViewFilter, CreateNoteInput, UpdateNoteInput } from "@z-notes/shared";
import type { AppContext } from "../context.js";
import { folders, notes, type NoteRow } from "../db/schema.js";
import { badRequest, notFound, conflict } from "../errors.js";
import { getFolderRow } from "./folders.js";
import { syncNoteMirror } from "./mirror-sync.js";
import { removeFile } from "../mirror/mirror.js";

function toMeta(row: NoteRow): NoteMeta {
  return {
    id: row.id,
    folderId: row.folderId,
    title: deriveTitle(row.contentMd),
    excerpt: deriveExcerpt(row.contentMd),
    archived: row.archivedAt !== null,
    deleted: row.deletedAt !== null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toNote(row: NoteRow): Note {
  return { ...toMeta(row), contentMd: row.contentMd, version: row.version };
}

export function getNoteRow(ctx: AppContext, id: number): NoteRow | undefined {
  return ctx.db.select().from(notes).where(eq(notes.id, id)).get();
}

export function getNote(ctx: AppContext, id: number): Note {
  const row = getNoteRow(ctx, id);
  if (!row) throw notFound("Nota não encontrada");
  return toNote(row);
}

export interface ListNotesParams {
  folderId?: number | null;
  view: NoteViewFilter;
}

export function listNotes(ctx: AppContext, params: ListNotesParams): NoteMeta[] {
  const filters = buildListFilters(params);
  const rows = ctx.db
    .select()
    .from(notes)
    .where(and(...filters))
    .orderBy(desc(notes.updatedAt))
    .all();
  return rows.map(toMeta);
}

function buildListFilters(params: ListNotesParams) {
  const { view, folderId } = params;
  if (view === "trash") return [isNotNull(notes.deletedAt)];
  const filters = [isNull(notes.deletedAt)];
  if (view === "archived") {
    filters.push(isNotNull(notes.archivedAt));
  } else {
    filters.push(isNull(notes.archivedAt));
  }
  if (folderId !== undefined && folderId !== null) {
    filters.push(eq(notes.folderId, folderId));
  }
  return filters;
}

export function createNote(ctx: AppContext, input: CreateNoteInput): Note {
  const folder = getFolderRow(ctx, input.folderId);
  if (!folder) throw badRequest("Pasta de destino não existe");
  const now = Date.now();
  const row = ctx.db
    .insert(notes)
    .values({
      folderId: input.folderId,
      contentMd: input.contentMd ?? "",
      version: 1,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();
  syncNoteMirror(ctx, row.id);
  return toNote(getNoteRow(ctx, row.id)!);
}

export function updateNote(ctx: AppContext, id: number, input: UpdateNoteInput): Note {
  const existing = getNoteRow(ctx, id);
  if (!existing) throw notFound("Nota não encontrada");
  if (existing.deletedAt !== null) throw badRequest("Nota na lixeira não pode ser editada; restaure antes");

  if (input.version !== undefined && input.version !== existing.version) {
    throw conflict("A nota foi alterada em outro lugar. Recarregue para ver a versão mais recente.");
  }

  const patch: Partial<NoteRow> = { updatedAt: Date.now(), version: existing.version + 1 };
  if (input.contentMd !== undefined) patch.contentMd = input.contentMd;
  if (input.folderId !== undefined) {
    if (!getFolderRow(ctx, input.folderId)) throw badRequest("Pasta de destino não existe");
    patch.folderId = input.folderId;
  }
  if (input.archived !== undefined) {
    patch.archivedAt = input.archived ? (existing.archivedAt ?? Date.now()) : null;
  }

  ctx.db.update(notes).set(patch).where(eq(notes.id, id)).run();
  syncNoteMirror(ctx, id);
  return toNote(getNoteRow(ctx, id)!);
}

/** Move para a lixeira (soft delete). */
export function trashNote(ctx: AppContext, id: number): void {
  const existing = getNoteRow(ctx, id);
  if (!existing) throw notFound("Nota não encontrada");
  ctx.db.update(notes).set({ deletedAt: Date.now(), updatedAt: Date.now() }).where(eq(notes.id, id)).run();
  syncNoteMirror(ctx, id);
}

export function restoreNote(ctx: AppContext, id: number): Note {
  const existing = getNoteRow(ctx, id);
  if (!existing) throw notFound("Nota não encontrada");
  const folderId = existing.folderId ?? fallbackFolderId(ctx);
  ctx.db
    .update(notes)
    .set({ deletedAt: null, folderId, updatedAt: Date.now() })
    .where(eq(notes.id, id))
    .run();
  syncNoteMirror(ctx, id);
  return toNote(getNoteRow(ctx, id)!);
}

/** Exclusão definitiva (remove do banco). */
export function hardDeleteNote(ctx: AppContext, id: number): void {
  const existing = getNoteRow(ctx, id);
  if (!existing) throw notFound("Nota não encontrada");
  if (existing.mirrorPath) removeFile(ctx.cfg.mirrorDir, existing.mirrorPath);
  ctx.db.delete(notes).where(eq(notes.id, id)).run();
}

/** Pasta padrão para restaurar notas órfãs (pasta cuja original foi excluída). */
function fallbackFolderId(ctx: AppContext): number {
  const root = ctx.db.select().from(folders).where(isNull(folders.parentId)).orderBy(asc(folders.position)).get();
  if (root) return root.id;
  const now = Date.now();
  const created = ctx.db
    .insert(folders)
    .values({ name: "Notas", parentId: null, position: 0, createdAt: now, updatedAt: now })
    .returning()
    .get();
  return created.id;
}
