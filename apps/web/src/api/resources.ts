import type {
  FolderTreeNode,
  Folder,
  Note,
  NoteMeta,
  SearchHit,
  NoteViewFilter,
  CreateFolderInput,
  UpdateFolderInput,
  CreateNoteInput,
  UpdateNoteInput,
  AuthMeResponse,
  MetricsResponse,
  Task,
  TaskArchive,
  TaskBoard,
  TaskFolder,
  TaskFolderWithCount,
  TaskList,
  CreateTaskFolderInput,
  UpdateTaskFolderInput,
  CreateTaskListInput,
  UpdateTaskListInput,
  CreateTaskInput,
  UpdateTaskInput,
  BatchArchiveTasksInput,
  ArchiveCompletedResponse,
  InboxItem,
  CreateInboxItemInput,
  UpdateInboxItemInput,
  ConvertInboxToTaskInput,
  ConvertInboxToTaskResponse,
  ConvertInboxToNoteInput,
  ConvertInboxToNoteResponse,
  InboxStatusFilter,
  InboxCountResponse,
} from "@z-notes/shared";
import { api } from "./http.js";

// Pastas
export const fetchFolders = () => api<FolderTreeNode[]>("/folders");
export const createFolder = (input: CreateFolderInput) =>
  api<Folder>("/folders", { method: "POST", body: JSON.stringify(input) });
export const updateFolder = (id: number, input: UpdateFolderInput) =>
  api<Folder>(`/folders/${id}`, { method: "PATCH", body: JSON.stringify(input) });
export const deleteFolder = (id: number) => api<void>(`/folders/${id}`, { method: "DELETE" });

// Notas
export interface ListNotesArgs {
  folderId: number | null;
  view: NoteViewFilter;
}
export function fetchNotes({ folderId, view }: ListNotesArgs) {
  const params = new URLSearchParams({ view });
  if (folderId !== null) params.set("folder", String(folderId));
  return api<NoteMeta[]>(`/notes?${params.toString()}`);
}
export const fetchNote = (id: number) => api<Note>(`/notes/${id}`);
export const createNote = (input: CreateNoteInput) =>
  api<Note>("/notes", { method: "POST", body: JSON.stringify(input) });
export const updateNote = (id: number, input: UpdateNoteInput) =>
  api<Note>(`/notes/${id}`, { method: "PATCH", body: JSON.stringify(input) });
export const trashNote = (id: number) => api<void>(`/notes/${id}`, { method: "DELETE" });
export const hardDeleteNote = (id: number) => api<void>(`/notes/${id}?hard=true`, { method: "DELETE" });
export const restoreNote = (id: number) => api<Note>(`/notes/${id}/restore`, { method: "POST" });

// Tarefas: pastas (quadros), listas (colunas) e tarefas
export const fetchTaskFolders = (view: "active" | "archived" = "active") =>
  api<TaskFolderWithCount[]>(`/task-folders?view=${view}`);
export const fetchTaskBoard = (folderId: number) => api<TaskBoard>(`/task-folders/${folderId}/board`);
export const createTaskFolder = (input: CreateTaskFolderInput) =>
  api<TaskFolder>("/task-folders", { method: "POST", body: JSON.stringify(input) });
export const updateTaskFolder = (id: number, input: UpdateTaskFolderInput) =>
  api<TaskFolder>(`/task-folders/${id}`, { method: "PATCH", body: JSON.stringify(input) });
export const deleteTaskFolder = (id: number) => api<void>(`/task-folders/${id}`, { method: "DELETE" });

export const createTaskList = (input: CreateTaskListInput) =>
  api<TaskList>("/task-lists", { method: "POST", body: JSON.stringify(input) });
export const updateTaskList = (id: number, input: UpdateTaskListInput) =>
  api<TaskList>(`/task-lists/${id}`, { method: "PATCH", body: JSON.stringify(input) });
export const deleteTaskList = (id: number) => api<void>(`/task-lists/${id}`, { method: "DELETE" });
export const archiveCompletedTasks = (listId: number) =>
  api<ArchiveCompletedResponse>(`/task-lists/${listId}/archive-completed`, { method: "POST", body: "{}" });

export const createTask = (input: CreateTaskInput) =>
  api<Task>("/tasks", { method: "POST", body: JSON.stringify(input) });
export const updateTask = (id: number, input: UpdateTaskInput) =>
  api<Task>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(input) });
export const deleteTask = (id: number) => api<void>(`/tasks/${id}`, { method: "DELETE" });
export const setTasksArchived = (input: BatchArchiveTasksInput) =>
  api<Task[]>("/tasks/archive", { method: "POST", body: JSON.stringify(input) });
export const fetchTaskArchive = () => api<TaskArchive>("/task-archive");
export const convertTaskToNote = (id: number, input: { folderId: number }) =>
  api<Note>(`/tasks/${id}/to-note`, { method: "POST", body: JSON.stringify(input) });

// Busca
export function searchNotes(q: string, folderId: number | null) {
  const params = new URLSearchParams({ q });
  if (folderId !== null) params.set("folder", String(folderId));
  return api<SearchHit[]>(`/search?${params.toString()}`);
}

// Auth (login via redirect OAuth — o browser navega, não é fetch)
export const googleLoginUrl = "/api/auth/google";
export const authMe = () => api<AuthMeResponse>("/auth/me");
export const authLogout = () => api<{ ok: true }>("/auth/logout", { method: "POST" });
export const authDeleteAccount = () => api<{ deleted: true }>("/auth/account", { method: "DELETE" });

// Admin (backend exige papel admin em cada rota: 403 sem isAdmin)
export const fetchAdminMetrics = () => api<MetricsResponse>("/admin/metrics");

// Import / Export
export function importFiles(files: File[]) {
  const form = new FormData();
  for (const file of files) form.append("files", file, file.webkitRelativePath || file.name);
  return api<{ notesImported: number }>("/import", { method: "POST", body: form });
}

// Inbox
export function fetchInbox(params: { status?: InboxStatusFilter; before?: number; limit?: number } = {}) {
  const sp = new URLSearchParams();
  if (params.status) sp.set("status", params.status);
  if (params.before !== undefined) sp.set("before", String(params.before));
  if (params.limit !== undefined) sp.set("limit", String(params.limit));
  const qs = sp.toString();
  return api<InboxItem[]>(`/inbox${qs ? `?${qs}` : ""}`);
}
export const fetchInboxCount = () => api<InboxCountResponse>("/inbox/count");
export const createInboxItem = (input: CreateInboxItemInput) =>
  api<InboxItem>("/inbox", { method: "POST", body: JSON.stringify(input) });
export const updateInboxItem = (id: number, input: UpdateInboxItemInput) =>
  api<InboxItem>(`/inbox/${id}`, { method: "PATCH", body: JSON.stringify(input) });
export const deleteInboxItem = (id: number) => api<void>(`/inbox/${id}`, { method: "DELETE" });
export const convertInboxToTask = (id: number, input: ConvertInboxToTaskInput) =>
  api<ConvertInboxToTaskResponse>(`/inbox/${id}/to-task`, { method: "POST", body: JSON.stringify(input) });
export const convertInboxToNote = (id: number, input: ConvertInboxToNoteInput) =>
  api<ConvertInboxToNoteResponse>(`/inbox/${id}/to-note`, { method: "POST", body: JSON.stringify(input) });
