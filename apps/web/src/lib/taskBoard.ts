import type { Task, TaskBoard, TaskListWithTasks, UpdateTaskInput } from "@z-notes/shared";

export const openTasks = (tasks: readonly Task[]): Task[] => tasks.filter((t) => !t.done);

/** Concluídas: as mais recentes primeiro. */
export const doneTasks = (tasks: readonly Task[]): Task[] =>
  tasks.filter((t) => t.done).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0));

function findTask(board: TaskBoard, taskId: number): { list: TaskListWithTasks; task: Task } | null {
  for (const list of board.lists) {
    const task = list.tasks.find((t) => t.id === taskId);
    if (task) return { list, task };
  }
  return null;
}

/**
 * Aplica no cache a mesma alteração que o servidor fará (atualização otimista).
 * O servidor continua sendo a fonte da verdade: depois da resposta o quadro é recarregado.
 */
export function applyTaskUpdate(board: TaskBoard, taskId: number, patch: UpdateTaskInput, now = Date.now()): TaskBoard {
  const found = findTask(board, taskId);
  if (!found) return board;

  const updated: Task = {
    ...found.task,
    title: patch.title ?? found.task.title,
    priority: patch.priority ?? found.task.priority,
    updatedAt: now,
  };
  if (patch.done !== undefined) {
    updated.done = patch.done;
    updated.doneAt = patch.done ? (found.task.doneAt ?? now) : null;
  }
  if (patch.listId !== undefined) updated.listId = patch.listId;

  const moving = patch.listId !== undefined || patch.afterId !== undefined;
  const targetListId = patch.listId ?? found.list.id;

  return {
    ...board,
    lists: board.lists.map((list) => {
      const without = list.tasks.filter((t) => t.id !== taskId);
      // Arquivada sai do quadro.
      if (patch.archived === true) return list.id === found.list.id ? { ...list, tasks: without } : list;
      if (!moving) {
        return list.id === found.list.id
          ? { ...list, tasks: list.tasks.map((t) => (t.id === taskId ? updated : t)) }
          : list;
      }
      if (list.id !== targetListId) return list.id === found.list.id ? { ...list, tasks: without } : list;
      return { ...list, tasks: insertAfter(without, updated, patch.afterId) };
    }),
  };
}

/** `afterId`: undefined = fim da lista, null = primeiro, número = logo depois dessa tarefa. */
function insertAfter(tasks: Task[], task: Task, afterId: number | null | undefined): Task[] {
  if (afterId === undefined) return [...tasks, task];
  if (afterId === null) return [task, ...tasks];
  const index = tasks.findIndex((t) => t.id === afterId);
  if (index === -1) return [...tasks, task];
  return [...tasks.slice(0, index + 1), task, ...tasks.slice(index + 1)];
}

export type DropTarget = { type: "task"; id: number } | { type: "list"; id: number };

export interface Move {
  listId: number;
  /** null = primeira posição da lista de destino. */
  afterId: number | null;
}

/**
 * Para onde vai a tarefa arrastada (`activeId`) quando solta sobre `over`.
 * Só as ABERTAS são arrastáveis, então a ordem considerada é a das abertas de cada lista.
 * Soltar sobre uma tarefa ocupa o lugar dela (como num sortable); soltar sobre a lista vai para o fim.
 * Devolve null quando nada mudaria.
 */
export function computeMove(board: TaskBoard, activeId: number, over: DropTarget): Move | null {
  const source = findTask(board, activeId);
  if (!source) return null;

  const sourceOpen = openTasks(source.list.tasks);
  const sourceIndex = sourceOpen.findIndex((t) => t.id === activeId);

  if (over.type === "list") {
    const target = board.lists.find((l) => l.id === over.id);
    if (!target) return null;
    const targetOpen = openTasks(target.tasks).filter((t) => t.id !== activeId);
    const last = targetOpen[targetOpen.length - 1];
    const afterId = last ? last.id : null;
    if (target.id === source.list.id && sourceIndex === sourceOpen.length - 1) return null;
    return { listId: target.id, afterId };
  }

  if (over.id === activeId) return null;
  const overFound = findTask(board, over.id);
  if (!overFound || overFound.task.done) return null;
  const targetList = overFound.list;
  const targetOpen = openTasks(targetList.tasks);
  const overIndex = targetOpen.findIndex((t) => t.id === over.id);

  if (targetList.id === source.list.id) {
    // Mesma lista: arrayMove(sourceIndex → overIndex); a tarefa fica depois do vizinho anterior do resultado.
    const reordered = [...sourceOpen];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(overIndex, 0, moved);
    const before = reordered[reordered.findIndex((t) => t.id === activeId) - 1];
    return { listId: targetList.id, afterId: before ? before.id : null };
  }

  // Outra lista: entra no lugar da tarefa sobre a qual foi solta.
  const before = targetOpen[overIndex - 1];
  return { listId: targetList.id, afterId: before ? before.id : null };
}
