import { and, eq, isNull, asc, sql } from "drizzle-orm";
import type { Folder, FolderTreeNode, CreateFolderInput, UpdateFolderInput } from "@z-notes/shared";
import type { AppContext } from "../context.js";
import { folders, notes, type FolderRow } from "../db/schema.js";
import { badRequest, notFound } from "../errors.js";
import { rebuildMirror } from "./mirror-sync.js";

function toApi(row: FolderRow): Folder {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parentId,
    position: row.position,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function getFolderRow(ctx: AppContext, id: number): FolderRow | undefined {
  return ctx.db.select().from(folders).where(eq(folders.id, id)).get();
}

/** Árvore completa: raízes ordenadas, cada uma com filhas (1 nível) e contagem de notas ativas. */
export function listFolderTree(ctx: AppContext): FolderTreeNode[] {
  const all = ctx.db.select().from(folders).orderBy(asc(folders.position), asc(folders.name)).all();
  const counts = activeNoteCounts(ctx);
  const roots = all.filter((f) => f.parentId === null);
  const childrenByParent = new Map<number, FolderRow[]>();
  for (const f of all) {
    if (f.parentId !== null) {
      const list = childrenByParent.get(f.parentId) ?? [];
      list.push(f);
      childrenByParent.set(f.parentId, list);
    }
  }
  return roots.map((root) => ({
    ...toApi(root),
    noteCount: counts.get(root.id) ?? 0,
    children: (childrenByParent.get(root.id) ?? []).map((child) => ({
      ...toApi(child),
      noteCount: counts.get(child.id) ?? 0,
    })),
  }));
}

function activeNoteCounts(ctx: AppContext): Map<number, number> {
  const rows = ctx.db
    .select({ folderId: notes.folderId, count: sql<number>`count(*)` })
    .from(notes)
    .where(and(isNull(notes.deletedAt), isNull(notes.archivedAt)))
    .groupBy(notes.folderId)
    .all();
  const map = new Map<number, number>();
  for (const r of rows) {
    if (r.folderId !== null) map.set(r.folderId, r.count);
  }
  return map;
}

export function createFolder(ctx: AppContext, input: CreateFolderInput): Folder {
  const name = input.name.trim();
  if (!name) throw badRequest("Nome da pasta é obrigatório");
  const parentId = input.parentId ?? null;
  if (parentId !== null) assertValidParent(ctx, parentId);
  const now = Date.now();
  const nextPosition = maxPosition(ctx, parentId) + 1;
  const row = ctx.db
    .insert(folders)
    .values({ name, parentId, position: nextPosition, createdAt: now, updatedAt: now })
    .returning()
    .get();
  return toApi(row);
}

export function updateFolder(ctx: AppContext, id: number, input: UpdateFolderInput): Folder {
  const existing = getFolderRow(ctx, id);
  if (!existing) throw notFound("Pasta não encontrada");

  const patch: Partial<FolderRow> = { updatedAt: Date.now() };
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw badRequest("Nome da pasta é obrigatório");
    patch.name = name;
  }
  if (input.position !== undefined) patch.position = input.position;
  if (input.parentId !== undefined) {
    const parentId = input.parentId;
    if (parentId !== null) {
      if (parentId === id) throw badRequest("Pasta não pode ser pai de si mesma");
      assertValidParent(ctx, parentId);
      if (hasChildren(ctx, id)) throw badRequest("Pasta com subpastas não pode virar subpasta (limite de 1 nível)");
    }
    patch.parentId = parentId;
  }

  const row = ctx.db.update(folders).set(patch).where(eq(folders.id, id)).returning().get();
  if (input.name !== undefined || input.parentId !== undefined) rebuildMirror(ctx);
  return toApi(row);
}

/** Exclui a pasta: manda as notas dela (e das subpastas) para a lixeira e apaga as pastas. */
export function deleteFolder(ctx: AppContext, id: number): void {
  const existing = getFolderRow(ctx, id);
  if (!existing) throw notFound("Pasta não encontrada");
  const childIds = ctx.db.select({ id: folders.id }).from(folders).where(eq(folders.parentId, id)).all().map((r) => r.id);
  const affectedFolderIds = [id, ...childIds];
  const now = Date.now();

  ctx.db.transaction((tx) => {
    for (const fid of affectedFolderIds) {
      tx.update(notes)
        .set({ deletedAt: now, folderId: null, mirrorPath: null, updatedAt: now })
        .where(and(eq(notes.folderId, fid), isNull(notes.deletedAt)))
        .run();
    }
    for (const cid of childIds) tx.delete(folders).where(eq(folders.id, cid)).run();
    tx.delete(folders).where(eq(folders.id, id)).run();
  });

  rebuildMirror(ctx);
}

function assertValidParent(ctx: AppContext, parentId: number): void {
  const parent = getFolderRow(ctx, parentId);
  if (!parent) throw badRequest("Pasta pai não existe");
  if (parent.parentId !== null) throw badRequest("Aninhamento de pastas limitado a 1 nível");
}

function hasChildren(ctx: AppContext, id: number): boolean {
  const child = ctx.db.select({ id: folders.id }).from(folders).where(eq(folders.parentId, id)).get();
  return child !== undefined;
}

function maxPosition(ctx: AppContext, parentId: number | null): number {
  const where = parentId === null ? isNull(folders.parentId) : eq(folders.parentId, parentId);
  const row = ctx.db.select({ max: sql<number | null>`max(${folders.position})` }).from(folders).where(where).get();
  return row?.max ?? 0;
}
