export type TaskPriority = "none" | "low" | "medium" | "high";

export const TASK_PRIORITIES: readonly TaskPriority[] = ["none", "low", "medium", "high"];

/** Ordem de importância: maior = mais urgente. */
const RANK: Record<TaskPriority, number> = { none: 0, low: 1, medium: 2, high: 3 };

export function priorityRank(priority: TaskPriority): number {
  return RANK[priority];
}

/** Ordena do mais urgente ao menos, mantendo a ordem manual (estável) entre prioridades iguais. */
export function sortByPriority<T extends { priority: TaskPriority }>(items: readonly T[]): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => RANK[b.item.priority] - RANK[a.item.priority] || a.index - b.index)
    .map((x) => x.item);
}

export interface TaskFolder {
  id: number;
  name: string;
  position: number;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface TaskFolderWithCount extends TaskFolder {
  /** tarefas abertas (não concluídas, não arquivadas) em listas não arquivadas. */
  openCount: number;
}

export interface TaskList {
  id: number;
  folderId: number;
  name: string;
  position: number;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Task {
  id: number;
  listId: number;
  title: string;
  priority: TaskPriority;
  position: number;
  done: boolean;
  doneAt: number | null;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface TaskListWithTasks extends TaskList {
  /** tarefas não arquivadas (abertas e concluídas), na ordem manual. */
  tasks: Task[];
}

/** Conteúdo de uma pasta de tarefas: listas (colunas) não arquivadas, com suas tarefas. */
export interface TaskBoard {
  folder: TaskFolder;
  lists: TaskListWithTasks[];
}

export interface ArchivedTaskFolder extends TaskFolder {
  listCount: number;
}

export interface ArchivedTaskList extends TaskList {
  folderName: string;
  taskCount: number;
}

export interface ArchivedTask extends Task {
  listName: string;
  folderId: number;
  folderName: string;
}

/**
 * Tudo que foi arquivado "diretamente". Itens dentro de um pai arquivado não aparecem
 * soltos: restaurar o pai traz o conteúdo de volta.
 */
export interface TaskArchive {
  folders: ArchivedTaskFolder[];
  lists: ArchivedTaskList[];
  tasks: ArchivedTask[];
}

export interface CreateTaskFolderInput {
  name: string;
}

export interface UpdateTaskFolderInput {
  name?: string;
  archived?: boolean;
  /** reordena: depois desta pasta (null = primeira). */
  afterId?: number | null;
}

export interface CreateTaskListInput {
  folderId: number;
  name: string;
}

export interface UpdateTaskListInput {
  name?: string;
  archived?: boolean;
  /** reordena dentro da pasta: depois desta lista (null = primeira). */
  afterId?: number | null;
}

export interface CreateTaskInput {
  listId: number;
  title: string;
  priority?: TaskPriority;
}

export interface UpdateTaskInput {
  title?: string;
  priority?: TaskPriority;
  done?: boolean;
  archived?: boolean;
  /** move para outra lista (vai para o fim, salvo se vier `afterId`). */
  listId?: number;
  /** posição na lista de destino: depois desta tarefa (null = primeira). */
  afterId?: number | null;
}

export interface BatchArchiveTasksInput {
  ids: number[];
  archived: boolean;
}

export interface ArchiveCompletedResponse {
  /** ids arquivados agora; o Desfazer reenvia exatamente estes. */
  ids: number[];
}
