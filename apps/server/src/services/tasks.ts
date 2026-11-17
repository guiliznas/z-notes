import { and, asc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import type {
  ArchivedTask,
  ArchivedTaskFolder,
  ArchivedTaskList,
  CreateTaskFolderInput,
  CreateTaskInput,
  CreateTaskListInput,
  Task,
  TaskArchive,
  TaskBoard,
  TaskFolder,
  TaskFolderWithCount,
  TaskList,
  TaskPriority,
  UpdateTaskFolderInput,
  UpdateTaskInput,
  UpdateTaskListInput,
} from "@z-notes/shared";
import type { RequestContext } from "../context.js";
import {
  taskFolders,
  taskLists,
  tasks,
  type TaskFolderRow,
  type TaskListRow,
  type TaskRow,
} from "../db/schema.js";
import { badRequest, notFound } from "../errors.js";
import { endPosition, placeAfter, type Sibling } from "./task-position.js";

/* ───────────── mapeamento ───────────── */

function folderToApi(row: TaskFolderRow): TaskFolder {
  return {
    id: row.id,
    name: row.name,
    position: row.position,
    archived: row.archivedAt !== null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function listToApi(row: TaskListRow): TaskList {
  return {
    id: row.id,
    folderId: row.folderId,
    name: row.name,
    position: row.position,
    archived: row.archivedAt !== null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function taskToApi(row: TaskRow): Task {
  return {
    id: row.id,
    listId: row.listId,
    title: row.title,
    priority: row.priority as TaskPriority,
    position: row.position,
    done: row.doneAt !== null,
    doneAt: row.doneAt,
    archived: row.archivedAt !== null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/* ───────────── ownership: acesso alheio → 404, nunca 403 ───────────── */

function getFolderRow(ctx: RequestContext, id: number): TaskFolderRow {
  const row = ctx.db
    .select()
    .from(taskFolders)
    .where(and(eq(taskFolders.id, id), eq(taskFolders.userId, ctx.userId)))
    .get();
  if (!row) throw notFound("Pasta de tarefas não encontrada");
  return row;
}

function getListRow(ctx: RequestContext, id: number): TaskListRow {
  const row = ctx.db
    .select()
    .from(taskLists)
    .where(and(eq(taskLists.id, id), eq(taskLists.userId, ctx.userId)))
    .get();
  if (!row) throw notFound("Lista não encontrada");
  return row;
}

function getTaskRow(ctx: RequestContext, id: number): TaskRow {
  const row = ctx.db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, ctx.userId)))
    .get();
  if (!row) throw notFound("Tarefa não encontrada");
  return row;
}

/* ───────────── posição ───────────── */

function folderSiblings(ctx: RequestContext, archived: boolean, excludeId?: number): Sibling[] {
  const rows = ctx.db
    .select({ id: taskFolders.id, position: taskFolders.position })
    .from(taskFolders)
    .where(and(eq(taskFolders.userId, ctx.userId), archived ? isNotNull(taskFolders.archivedAt) : isNull(taskFolders.archivedAt)))
    .orderBy(asc(taskFolders.position))
    .all();
  return rows.filter((r) => r.id !== excludeId);
}

function listSiblings(ctx: RequestContext, folderId: number, excludeId?: number): Sibling[] {
  const rows = ctx.db
    .select({ id: taskLists.id, position: taskLists.position })
    .from(taskLists)
    .where(and(eq(taskLists.folderId, folderId), eq(taskLists.userId, ctx.userId), isNull(taskLists.archivedAt)))
    .orderBy(asc(taskLists.position))
    .all();
  return rows.filter((r) => r.id !== excludeId);
}

function taskSiblings(ctx: RequestContext, listId: number, excludeId?: number): Sibling[] {
  const rows = ctx.db
    .select({ id: tasks.id, position: tasks.position })
    .from(tasks)
    .where(and(eq(tasks.listId, listId), eq(tasks.userId, ctx.userId), isNull(tasks.archivedAt)))
    .orderBy(asc(tasks.position))
    .all();
  return rows.filter((r) => r.id !== excludeId);
}

type PositionTable = typeof taskFolders | typeof taskLists | typeof tasks;

/** Aplica a posição calculada (e o rebalanceamento, se houve) numa única transação. */
function applyPlacement(
  ctx: RequestContext,
  table: PositionTable,
  id: number,
  siblings: Sibling[],
  afterId: number | null,
  now: number,
): number {
  const placement = placeAfter(siblings, afterId);
  if (!placement) throw badRequest("Posição de destino inválida");
  for (const [siblingId, position] of placement.renumber ?? []) {
    ctx.db.update(table).set({ position }).where(eq(table.id, siblingId)).run();
  }
  ctx.db.update(table).set({ position: placement.position, updatedAt: now }).where(eq(table.id, id)).run();
  return placement.position;
}

/* ───────────── pastas ───────────── */

export function listTaskFolders(ctx: RequestContext, view: "active" | "archived"): TaskFolderWithCount[] {
  const rows = ctx.db
    .select()
    .from(taskFolders)
    .where(
      and(
        eq(taskFolders.userId, ctx.userId),
        view === "archived" ? isNotNull(taskFolders.archivedAt) : isNull(taskFolders.archivedAt),
      ),
    )
    .orderBy(asc(taskFolders.position))
    .all();
  const counts = openCounts(ctx);
  return rows.map((row) => ({ ...folderToApi(row), openCount: counts.get(row.id) ?? 0 }));
}

function openCounts(ctx: RequestContext): Map<number, number> {
  const rows = ctx.sqlite
    .prepare(
      `SELECT l.folder_id AS folderId, COUNT(*) AS c
       FROM tasks t JOIN task_lists l ON l.id = t.list_id
       WHERE t.user_id = ? AND t.archived_at IS NULL AND t.done_at IS NULL AND l.archived_at IS NULL
       GROUP BY l.folder_id`,
    )
    .all(ctx.userId) as { folderId: number; c: number }[];
  return new Map(rows.map((r) => [r.folderId, r.c]));
}

export function createTaskFolder(ctx: RequestContext, input: CreateTaskFolderInput): TaskFolder {
  const now = Date.now();
  const row = ctx.db
    .insert(taskFolders)
    .values({
      userId: ctx.userId,
      name: input.name,
      position: endPosition(folderSiblings(ctx, false)),
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();
  return folderToApi(row);
}

export function updateTaskFolder(ctx: RequestContext, id: number, input: UpdateTaskFolderInput): TaskFolder {
  const existing = getFolderRow(ctx, id);
  const now = Date.now();
  ctx.sqlite.transaction(() => {
    const patch: Partial<TaskFolderRow> = { updatedAt: now };
    if (input.name !== undefined) patch.name = input.name;
    if (input.archived !== undefined) {
      patch.archivedAt = input.archived ? (existing.archivedAt ?? now) : null;
      // Ao restaurar, volta para o fim das pastas ativas.
      if (!input.archived && existing.archivedAt !== null) {
        patch.position = endPosition(folderSiblings(ctx, false, id));
      }
    }
    ctx.db.update(taskFolders).set(patch).where(eq(taskFolders.id, id)).run();
    if (input.afterId !== undefined) {
      if (input.afterId === id) throw badRequest("Posição de destino inválida");
      applyPlacement(ctx, taskFolders, id, folderSiblings(ctx, false, id), input.afterId, now);
    }
  })();
  return folderToApi(getFolderRow(ctx, id));
}

/** Exclusão definitiva: as listas e tarefas vão junto (ON DELETE CASCADE). */
export function deleteTaskFolder(ctx: RequestContext, id: number): void {
  getFolderRow(ctx, id);
  ctx.db.delete(taskFolders).where(eq(taskFolders.id, id)).run();
}

/** Quadro: listas não arquivadas (colunas) com suas tarefas não arquivadas, abertas e concluídas. */
export function getTaskBoard(ctx: RequestContext, folderId: number): TaskBoard {
  const folder = getFolderRow(ctx, folderId);
  const lists = ctx.db
    .select()
    .from(taskLists)
    .where(and(eq(taskLists.folderId, folderId), eq(taskLists.userId, ctx.userId), isNull(taskLists.archivedAt)))
    .orderBy(asc(taskLists.position))
    .all();
  const listIds = lists.map((l) => l.id);
  const rows = listIds.length
    ? ctx.db
        .select()
        .from(tasks)
        .where(and(inArray(tasks.listId, listIds), eq(tasks.userId, ctx.userId), isNull(tasks.archivedAt)))
        .orderBy(asc(tasks.position))
        .all()
    : [];
  return {
    folder: folderToApi(folder),
    lists: lists.map((list) => ({
      ...listToApi(list),
      tasks: rows.filter((t) => t.listId === list.id).map(taskToApi),
    })),
  };
}

/* ───────────── listas ───────────── */

export function createTaskList(ctx: RequestContext, input: CreateTaskListInput): TaskList {
  const folder = getFolderRow(ctx, input.folderId);
  if (folder.archivedAt !== null) throw badRequest("Pasta arquivada: restaure antes de criar listas");
  const now = Date.now();
  const row = ctx.db
    .insert(taskLists)
    .values({
      userId: ctx.userId,
      folderId: folder.id,
      name: input.name,
      position: endPosition(listSiblings(ctx, folder.id)),
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();
  return listToApi(row);
}

export function updateTaskList(ctx: RequestContext, id: number, input: UpdateTaskListInput): TaskList {
  const existing = getListRow(ctx, id);
  const now = Date.now();
  ctx.sqlite.transaction(() => {
    const patch: Partial<TaskListRow> = { updatedAt: now };
    if (input.name !== undefined) patch.name = input.name;
    if (input.archived !== undefined) {
      patch.archivedAt = input.archived ? (existing.archivedAt ?? now) : null;
      if (!input.archived && existing.archivedAt !== null) {
        patch.position = endPosition(listSiblings(ctx, existing.folderId, id));
      }
    }
    ctx.db.update(taskLists).set(patch).where(eq(taskLists.id, id)).run();
    if (input.afterId !== undefined) {
      if (input.afterId === id) throw badRequest("Posição de destino inválida");
      applyPlacement(ctx, taskLists, id, listSiblings(ctx, existing.folderId, id), input.afterId, now);
    }
  })();
  return listToApi(getListRow(ctx, id));
}

export function deleteTaskList(ctx: RequestContext, id: number): void {
  getListRow(ctx, id);
  ctx.db.delete(taskLists).where(eq(taskLists.id, id)).run();
}

/** Arquiva todas as concluídas (ainda não arquivadas) da lista e devolve os ids, para o Desfazer. */
export function archiveCompleted(ctx: RequestContext, listId: number): number[] {
  getListRow(ctx, listId);
  const now = Date.now();
  return ctx.sqlite.transaction(() => {
    const rows = ctx.db
      .select({ id: tasks.id })
      .from(tasks)
      .where(
        and(
          eq(tasks.listId, listId),
          eq(tasks.userId, ctx.userId),
          isNotNull(tasks.doneAt),
          isNull(tasks.archivedAt),
        ),
      )
      .all();
    const ids = rows.map((r) => r.id);
    if (ids.length > 0) {
      ctx.db.update(tasks).set({ archivedAt: now, updatedAt: now }).where(inArray(tasks.id, ids)).run();
    }
    return ids;
  })();
}

/* ───────────── tarefas ───────────── */

export function createTask(ctx: RequestContext, input: CreateTaskInput): Task {
  const list = getListRow(ctx, input.listId);
  if (list.archivedAt !== null) throw badRequest("Lista arquivada: restaure antes de adicionar tarefas");
  const now = Date.now();
  const row = ctx.db
    .insert(tasks)
    .values({
      userId: ctx.userId,
      listId: list.id,
      title: input.title,
      priority: input.priority ?? "none",
      position: endPosition(taskSiblings(ctx, list.id)),
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();
  return taskToApi(row);
}

export function updateTask(ctx: RequestContext, id: number, input: UpdateTaskInput): Task {
  const existing = getTaskRow(ctx, id);
  const now = Date.now();
  ctx.sqlite.transaction(() => {
    const patch: Partial<TaskRow> = { updatedAt: now };
    if (input.title !== undefined) patch.title = input.title;
    if (input.priority !== undefined) patch.priority = input.priority;
    if (input.done !== undefined) patch.doneAt = input.done ? (existing.doneAt ?? now) : null;

    let targetListId = existing.listId;
    if (input.listId !== undefined && input.listId !== existing.listId) {
      const target = getListRow(ctx, input.listId);
      if (target.archivedAt !== null) throw badRequest("Lista de destino arquivada");
      targetListId = target.id;
      patch.listId = target.id;
      patch.position = endPosition(taskSiblings(ctx, target.id, id));
    }
    if (input.archived !== undefined) {
      patch.archivedAt = input.archived ? (existing.archivedAt ?? now) : null;
      // Ao restaurar, volta para o fim da lista (não reordena o que já foi organizado).
      if (!input.archived && existing.archivedAt !== null && patch.position === undefined) {
        patch.position = endPosition(taskSiblings(ctx, targetListId, id));
      }
    }
    ctx.db.update(tasks).set(patch).where(eq(tasks.id, id)).run();

    if (input.afterId !== undefined) {
      if (input.afterId === id) throw badRequest("Posição de destino inválida");
      applyPlacement(ctx, tasks, id, taskSiblings(ctx, targetListId, id), input.afterId, now);
    }
  })();
  return taskToApi(getTaskRow(ctx, id));
}

export function deleteTask(ctx: RequestContext, id: number): void {
  getTaskRow(ctx, id);
  ctx.db.delete(tasks).where(eq(tasks.id, id)).run();
}

/** Arquiva/restaura várias tarefas de uma vez. Qualquer id que não seja do usuário → 404 (nada é alterado). */
export function setTasksArchived(ctx: RequestContext, ids: number[], archived: boolean): Task[] {
  const unique = [...new Set(ids)];
  const now = Date.now();
  return ctx.sqlite.transaction(() => {
    const rows = ctx.db
      .select()
      .from(tasks)
      .where(and(inArray(tasks.id, unique), eq(tasks.userId, ctx.userId)))
      .all();
    if (rows.length !== unique.length) throw notFound("Tarefa não encontrada");
    for (const row of rows) {
      const patch: Partial<TaskRow> = { archivedAt: archived ? (row.archivedAt ?? now) : null, updatedAt: now };
      // Desfazer devolve cada tarefa à posição que tinha; o restante da lista não se mexe.
      ctx.db.update(tasks).set(patch).where(eq(tasks.id, row.id)).run();
    }
    return unique.map((id) => taskToApi(getTaskRow(ctx, id)));
  })();
}

/* ───────────── arquivadas ───────────── */

/**
 * Itens arquivados "diretamente". Um item dentro de pai arquivado só aparece com o pai:
 * lista só se a pasta está ativa; tarefa só se lista e pasta estão ativas.
 */
export function getTaskArchive(ctx: RequestContext): TaskArchive {
  const folderRows = ctx.db
    .select()
    .from(taskFolders)
    .where(and(eq(taskFolders.userId, ctx.userId), isNotNull(taskFolders.archivedAt)))
    .orderBy(asc(taskFolders.position))
    .all();
  const listCounts = new Map(
    (
      ctx.sqlite
        .prepare(`SELECT folder_id AS id, COUNT(*) AS c FROM task_lists WHERE user_id = ? GROUP BY folder_id`)
        .all(ctx.userId) as { id: number; c: number }[]
    ).map((r) => [r.id, r.c]),
  );
  const folders: ArchivedTaskFolder[] = folderRows.map((f) => ({ ...folderToApi(f), listCount: listCounts.get(f.id) ?? 0 }));

  const listRows = ctx.sqlite
    .prepare(
      `SELECT l.*, f.name AS folderName,
              (SELECT COUNT(*) FROM tasks t WHERE t.list_id = l.id AND t.archived_at IS NULL) AS taskCount
       FROM task_lists l JOIN task_folders f ON f.id = l.folder_id
       WHERE l.user_id = ? AND l.archived_at IS NOT NULL AND f.archived_at IS NULL
       ORDER BY l.archived_at DESC`,
    )
    .all(ctx.userId) as (Record<string, unknown> & { folderName: string; taskCount: number })[];
  const lists: ArchivedTaskList[] = listRows.map((r) => ({
    id: r.id as number,
    folderId: r.folder_id as number,
    name: r.name as string,
    position: r.position as number,
    archived: true,
    createdAt: r.created_at as number,
    updatedAt: r.updated_at as number,
    folderName: r.folderName,
    taskCount: r.taskCount,
  }));

  const taskRows = ctx.sqlite
    .prepare(
      `SELECT t.*, l.name AS listName, l.folder_id AS folderId, f.name AS folderName
       FROM tasks t
       JOIN task_lists l ON l.id = t.list_id
       JOIN task_folders f ON f.id = l.folder_id
       WHERE t.user_id = ? AND t.archived_at IS NOT NULL AND l.archived_at IS NULL AND f.archived_at IS NULL
       ORDER BY t.archived_at DESC`,
    )
    .all(ctx.userId) as (Record<string, unknown> & { listName: string; folderId: number; folderName: string })[];
  const archivedTasks: ArchivedTask[] = taskRows.map((r) => ({
    id: r.id as number,
    listId: r.list_id as number,
    title: r.title as string,
    priority: r.priority as TaskPriority,
    position: r.position as number,
    done: r.done_at !== null,
    doneAt: r.done_at as number | null,
    archived: true,
    createdAt: r.created_at as number,
    updatedAt: r.updated_at as number,
    listName: r.listName,
    folderId: r.folderId,
    folderName: r.folderName,
  }));

  return { folders, lists, tasks: archivedTasks };
}
