import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type {
  CreateTaskFolderInput,
  CreateTaskInput,
  CreateTaskListInput,
  TaskBoard,
  UpdateTaskFolderInput,
  UpdateTaskInput,
  UpdateTaskListInput,
} from "@z-notes/shared";
import {
  archiveCompletedTasks,
  createTask,
  createTaskFolder,
  createTaskList,
  deleteTask,
  deleteTaskFolder,
  deleteTaskList,
  fetchTaskArchive,
  fetchTaskBoard,
  fetchTaskFolders,
  setTasksArchived,
  updateTask,
  updateTaskFolder,
  updateTaskList,
} from "@/api/resources";
import { applyTaskUpdate } from "@/lib/taskBoard";

export const TASK_FOLDERS_KEY = ["task-folders"] as const;
export const TASK_BOARD_KEY = ["task-board"] as const;
export const TASK_ARCHIVE_KEY = ["task-archive"] as const;

export const taskBoardKey = (folderId: number) => [...TASK_BOARD_KEY, folderId] as const;

export function useTaskFolders(view: "active" | "archived" = "active") {
  return useQuery({ queryKey: [...TASK_FOLDERS_KEY, view], queryFn: () => fetchTaskFolders(view) });
}

export function useTaskBoard(folderId: number | null) {
  return useQuery({
    queryKey: folderId !== null ? taskBoardKey(folderId) : [...TASK_BOARD_KEY, "none"],
    queryFn: () => fetchTaskBoard(folderId as number),
    enabled: folderId !== null,
  });
}

export function useTaskArchive() {
  return useQuery({ queryKey: TASK_ARCHIVE_KEY, queryFn: fetchTaskArchive });
}

/** Qualquer mudança em tarefas pode afetar quadro, contagens das pastas e Arquivadas. */
function invalidateAll(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: TASK_FOLDERS_KEY });
  qc.invalidateQueries({ queryKey: TASK_BOARD_KEY });
  qc.invalidateQueries({ queryKey: TASK_ARCHIVE_KEY });
}

function mutationWithInvalidation<TVars, TData>(fn: (vars: TVars) => Promise<TData>) {
  return () => {
    const qc = useQueryClient();
    return useMutation({ mutationFn: fn, onSuccess: () => invalidateAll(qc) });
  };
}

export const useCreateTaskFolder = mutationWithInvalidation((input: CreateTaskFolderInput) => createTaskFolder(input));
export const useDeleteTaskFolder = mutationWithInvalidation((id: number) => deleteTaskFolder(id));
export const useCreateTaskList = mutationWithInvalidation((input: CreateTaskListInput) => createTaskList(input));
export const useDeleteTaskList = mutationWithInvalidation((id: number) => deleteTaskList(id));
export const useCreateTask = mutationWithInvalidation((input: CreateTaskInput) => createTask(input));
export const useDeleteTask = mutationWithInvalidation((id: number) => deleteTask(id));
export const useArchiveCompleted = mutationWithInvalidation((listId: number) => archiveCompletedTasks(listId));
export const useSetTasksArchived = mutationWithInvalidation((input: { ids: number[]; archived: boolean }) =>
  setTasksArchived(input),
);

export const useUpdateTaskFolder = mutationWithInvalidation(
  ({ id, input }: { id: number; input: UpdateTaskFolderInput }) => updateTaskFolder(id, input),
);
export const useUpdateTaskList = mutationWithInvalidation(({ id, input }: { id: number; input: UpdateTaskListInput }) =>
  updateTaskList(id, input),
);

/**
 * Atualiza uma tarefa (concluir, prioridade, título, arquivar, mover, reordenar) com resposta imediata:
 * aplica a mudança no quadro em cache, e desfaz se o servidor recusar.
 */
export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: number } & UpdateTaskInput) => updateTask(id, input),
    onMutate: async ({ id, ...patch }) => {
      await qc.cancelQueries({ queryKey: TASK_BOARD_KEY });
      const snapshots = qc.getQueriesData<TaskBoard>({ queryKey: TASK_BOARD_KEY });
      for (const [key, board] of snapshots) {
        if (board) qc.setQueryData(key, applyTaskUpdate(board, id, patch));
      }
      return { snapshots };
    },
    onError: (_err, _vars, context) => {
      for (const [key, board] of context?.snapshots ?? []) qc.setQueryData(key, board);
    },
    onSettled: () => invalidateAll(qc),
  });
}
