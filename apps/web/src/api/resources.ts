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

// Busca
export function searchNotes(q: string, folderId: number | null) {
  const params = new URLSearchParams({ q });
  if (folderId !== null) params.set("folder", String(folderId));
  return api<SearchHit[]>(`/search?${params.toString()}`);
}

// Auth
export const authMe = () => api<{ authenticated: boolean }>("/auth/me");
export const authLogin = (password: string) =>
  api<{ ok: true }>("/auth/login", { method: "POST", body: JSON.stringify({ password }) });
export const authLogout = () => api<{ ok: true }>("/auth/logout", { method: "POST" });

// Import / Export
export function importFiles(files: File[]) {
  const form = new FormData();
  for (const file of files) form.append("files", file, file.webkitRelativePath || file.name);
  return api<{ notesImported: number }>("/import", { method: "POST", body: form });
}
