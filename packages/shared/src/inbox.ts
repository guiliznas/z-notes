import type { Note } from "./types.js";
import type { Task } from "./tasks.js";

export type InboxSource = "app" | "share" | "desktop" | "api";

export type InboxResolvedKind = "task" | "note";

export type InboxStatusFilter = "pending" | "archived" | "resolved";

export interface InboxItem {
  id: number;
  clientId: string;
  content: string;
  source: InboxSource;
  capturedAt: number;
  archived: boolean;
  archivedAt: number | null;
  resolvedKind: InboxResolvedKind | null;
  resolvedId: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface CreateInboxItemInput {
  clientId: string;
  content: string;
  source?: InboxSource;
  capturedAt?: number;
}

export interface UpdateInboxItemInput {
  archived: boolean;
}

export interface ConvertInboxToTaskInput {
  listId: number;
}

export interface ConvertInboxToNoteInput {
  folderId: number;
}

export interface ConvertInboxToTaskResponse {
  item: InboxItem;
  task: Task;
}

export interface ConvertInboxToNoteResponse {
  item: InboxItem;
  note: Note;
}

export interface InboxCountResponse {
  count: number;
}
