import { and, desc, eq, isNotNull, isNull, lt, sql } from "drizzle-orm";
import type {
  ConvertInboxToNoteResponse,
  ConvertInboxToTaskResponse,
  CreateInboxItemInput,
  InboxItem,
  InboxResolvedKind,
  InboxSource,
  InboxStatusFilter,
  Task,
  UpdateInboxItemInput,
} from "@z-notes/shared";
import type { RequestContext } from "../context.js";
import { inboxItems, taskFolders, taskLists, tasks, type InboxItemRow, type TaskRow } from "../db/schema.js";
import { badRequest, notFound } from "../errors.js";
import { getFolderRow } from "./folders.js";
import { createNote, getNote } from "./notes.js";
import { createTask } from "./tasks.js";

/* ───────────── mapeamento ───────────── */

function toApi(row: InboxItemRow): InboxItem {
  return {
    id: row.id,
    clientId: row.clientId,
    content: row.content,
    source: row.source as InboxSource,
    capturedAt: row.capturedAt,
    archived: row.archivedAt !== null,
    archivedAt: row.archivedAt,
    resolvedKind: (row.resolvedKind as InboxResolvedKind) ?? null,
    resolvedId: row.resolvedId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function taskToApi(row: TaskRow): Task {
  return {
    id: row.id,
    listId: row.listId,
    title: row.title,
    contentMd: row.contentMd ?? "",
    priority: row.priority as Task["priority"],
    position: row.position,
    done: row.doneAt !== null,
    doneAt: row.doneAt,
    archived: row.archivedAt !== null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Guard de ownership: toda consulta por id filtra pelo dono (cross-access → 404). */
function owned(ctx: RequestContext, id: number) {
  return and(eq(inboxItems.id, id), eq(inboxItems.userId, ctx.userId));
}

export function getInboxItemRow(ctx: RequestContext, id: number): InboxItemRow | undefined {
  return ctx.db.select().from(inboxItems).where(owned(ctx, id)).get();
}

export function getInboxItem(ctx: RequestContext, id: number): InboxItem {
  const row = getInboxItemRow(ctx, id);
  if (!row) throw notFound("Item do inbox não encontrado");
  return toApi(row);
}

export interface ListInboxParams {
  status?: InboxStatusFilter;
  before?: number;
  limit?: number;
}

export function listInbox(ctx: RequestContext, params: ListInboxParams = {}): InboxItem[] {
  const status = params.status ?? "pending";
  const limit = Math.max(1, Math.min(params.limit ?? 50, 100));

  const conditions = [eq(inboxItems.userId, ctx.userId)];

  if (status === "pending") {
    conditions.push(isNull(inboxItems.archivedAt));
    conditions.push(isNull(inboxItems.resolvedKind));
  } else if (status === "archived") {
    conditions.push(isNotNull(inboxItems.archivedAt));
  } else if (status === "resolved") {
    conditions.push(isNotNull(inboxItems.resolvedKind));
  }

  if (params.before) {
    const cursor = getInboxItemRow(ctx, params.before);
    if (cursor) {
      conditions.push(
        sql`(${inboxItems.capturedAt} < ${cursor.capturedAt} OR (${inboxItems.capturedAt} = ${cursor.capturedAt} AND ${inboxItems.id} < ${cursor.id}))`,
      );
    } else {
      conditions.push(lt(inboxItems.id, params.before));
    }
  }

  const rows = ctx.db
    .select()
    .from(inboxItems)
    .where(and(...conditions))
    .orderBy(desc(inboxItems.capturedAt), desc(inboxItems.id))
    .limit(limit)
    .all();

  return rows.map(toApi);
}

export function countPendingInbox(ctx: RequestContext): number {
  const row = ctx.db
    .select({ count: sql<number>`count(*)` })
    .from(inboxItems)
    .where(
      and(
        eq(inboxItems.userId, ctx.userId),
        isNull(inboxItems.archivedAt),
        isNull(inboxItems.resolvedKind),
      ),
    )
    .get();
  return row?.count ?? 0;
}

export function createInboxItem(
  ctx: RequestContext,
  input: CreateInboxItemInput,
): { item: InboxItem; created: boolean } {
  const clientId = input.clientId.trim();
  if (!clientId) throw badRequest("clientId é obrigatório");

  const existing = ctx.db
    .select()
    .from(inboxItems)
    .where(and(eq(inboxItems.userId, ctx.userId), eq(inboxItems.clientId, clientId)))
    .get();

  if (existing) {
    return { item: toApi(existing), created: false };
  }

  const content = input.content.trim();
  if (!content) throw badRequest("Conteúdo é obrigatório");
  if (content.length > 20000) throw badRequest("Conteúdo excede limite de 20.000 caracteres");

  const now = Date.now();
  const capturedAt = input.capturedAt ? Math.min(input.capturedAt, now) : now;
  const source = input.source ?? "api";

  const row = ctx.db
    .insert(inboxItems)
    .values({
      userId: ctx.userId,
      clientId,
      content,
      source,
      capturedAt,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();

  return { item: toApi(row), created: true };
}

export function updateInboxItem(
  ctx: RequestContext,
  id: number,
  input: UpdateInboxItemInput,
): InboxItem {
  const existing = getInboxItemRow(ctx, id);
  if (!existing) throw notFound("Item do inbox não encontrado");

  const now = Date.now();
  const archivedAt = input.archived ? (existing.archivedAt ?? now) : null;

  const row = ctx.db
    .update(inboxItems)
    .set({
      archivedAt,
      updatedAt: now,
    })
    .where(owned(ctx, id))
    .returning()
    .get();

  return toApi(row);
}

export function deleteInboxItem(ctx: RequestContext, id: number): void {
  const existing = getInboxItemRow(ctx, id);
  if (!existing) throw notFound("Item do inbox não encontrado");

  ctx.db.delete(inboxItems).where(owned(ctx, id)).run();
}

export function convertInboxToTask(
  ctx: RequestContext,
  id: number,
  listId: number,
): ConvertInboxToTaskResponse {
  const existing = getInboxItemRow(ctx, id);
  if (!existing) throw notFound("Item do inbox não encontrado");

  if (existing.resolvedKind === "task" && existing.resolvedId !== null) {
    const existingTask = ctx.db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, existing.resolvedId), eq(tasks.userId, ctx.userId)))
      .get();
    if (existingTask) {
      return { item: toApi(existing), task: taskToApi(existingTask) };
    }
  }

  if (existing.resolvedKind === "note") {
    throw badRequest("Item já foi resolvido como nota");
  }

  const list = ctx.db
    .select()
    .from(taskLists)
    .where(and(eq(taskLists.id, listId), eq(taskLists.userId, ctx.userId)))
    .get();
  if (!list) throw badRequest("Lista de destino não existe");
  if (list.archivedAt !== null) throw badRequest("Lista de destino está arquivada");

  const folder = ctx.db
    .select()
    .from(taskFolders)
    .where(and(eq(taskFolders.id, list.folderId), eq(taskFolders.userId, ctx.userId)))
    .get();
  if (!folder) throw badRequest("Pasta da lista não existe");
  if (folder.archivedAt !== null) throw badRequest("Pasta de destino está arquivada");

  const trimmed = existing.content.trim();
  const newlineIdx = trimmed.indexOf("\n");
  let title: string;
  let contentMd = "";

  if (newlineIdx !== -1) {
    const firstLine = trimmed.slice(0, newlineIdx).trim();
    const remainder = trimmed.slice(newlineIdx + 1).trim();
    title = firstLine.slice(0, 500) || "Sem título";
    const overflow = firstLine.length > 500 ? firstLine.slice(500).trim() : "";
    contentMd = overflow ? (remainder ? `${overflow}\n\n${remainder}` : overflow) : remainder;
  } else {
    title = trimmed.slice(0, 500) || "Sem título";
    contentMd = trimmed.length > 500 ? trimmed.slice(500).trim() : "";
  }
  const now = Date.now();

  let createdTask: Task;
  let updatedItem: InboxItemRow;

  ctx.sqlite.transaction(() => {
    createdTask = createTask(ctx, { listId: list.id, title, contentMd });

    updatedItem = ctx.db
      .update(inboxItems)
      .set({
        resolvedKind: "task",
        resolvedId: createdTask.id,
        updatedAt: now,
      })
      .where(owned(ctx, id))
      .returning()
      .get();
  })();

  return { item: toApi(updatedItem!), task: createdTask! };
}

export function convertInboxToNote(
  ctx: RequestContext,
  id: number,
  folderId: number,
): ConvertInboxToNoteResponse {
  const existing = getInboxItemRow(ctx, id);
  if (!existing) throw notFound("Item do inbox não encontrado");

  if (existing.resolvedKind === "note" && existing.resolvedId !== null) {
    const existingNote = getNote(ctx, existing.resolvedId);
    return { item: toApi(existing), note: existingNote };
  }

  if (existing.resolvedKind === "task") {
    throw badRequest("Item já foi resolvido como tarefa");
  }

  const folder = getFolderRow(ctx, folderId);
  if (!folder) throw badRequest("Pasta de destino não existe");

  const now = Date.now();
  let createdNote: ReturnType<typeof createNote>;
  let updatedItem: InboxItemRow;

  ctx.sqlite.transaction(() => {
    createdNote = createNote(ctx, { folderId, contentMd: existing.content });

    updatedItem = ctx.db
      .update(inboxItems)
      .set({
        resolvedKind: "note",
        resolvedId: createdNote.id,
        updatedAt: now,
      })
      .where(owned(ctx, id))
      .returning()
      .get();
  })();

  return { item: toApi(updatedItem!), note: createdNote! };
}
