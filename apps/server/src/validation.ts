import { z } from "zod";

export const OAuthCallbackQuery = z.object({
  code: z.string().min(1, "code é obrigatório").optional(),
  state: z.string().min(1, "state é obrigatório").optional(),
  error: z.string().optional(),
});

export const CreateFolderSchema = z.object({
  name: z.string().min(1),
  parentId: z.number().int().positive().nullable().optional(),
});

export const UpdateFolderSchema = z.object({
  name: z.string().min(1).optional(),
  parentId: z.number().int().positive().nullable().optional(),
  position: z.number().int().optional(),
});

export const CreateNoteSchema = z.object({
  folderId: z.number().int().positive(),
  contentMd: z.string().optional(),
});

export const UpdateNoteSchema = z.object({
  contentMd: z.string().optional(),
  version: z.number().int().nonnegative().optional(),
  folderId: z.number().int().positive().optional(),
  archived: z.boolean().optional(),
  pinned: z.boolean().optional(),
});

export const ListNotesQuery = z.object({
  folder: z.coerce.number().int().positive().optional(),
  view: z.enum(["active", "archived", "trash", "pinned"]).default("active"),
});

export const SearchQuery = z.object({
  q: z.string().default(""),
  folder: z.coerce.number().int().positive().optional(),
});

export const IdParam = z.object({
  id: z.coerce.number().int().positive(),
});

export const DeleteNoteQuery = z.object({
  hard: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

/* ───────────── tarefas ───────────── */

const TaskName = z.string().trim().min(1, "nome é obrigatório").max(100, "nome muito longo");
const TaskTitle = z.string().trim().min(1, "título é obrigatório").max(500, "título muito longo");
const TaskPriority = z.enum(["none", "low", "medium", "high"]);
const AfterId = z.number().int().positive().nullable().optional();

export const TaskFoldersQuery = z.object({
  view: z.enum(["active", "archived"]).default("active"),
});

export const CreateTaskFolderSchema = z.object({ name: TaskName });

export const UpdateTaskFolderSchema = z.object({
  name: TaskName.optional(),
  archived: z.boolean().optional(),
  afterId: AfterId,
});

export const CreateTaskListSchema = z.object({
  folderId: z.number().int().positive(),
  name: TaskName,
});

export const UpdateTaskListSchema = z.object({
  name: TaskName.optional(),
  archived: z.boolean().optional(),
  afterId: AfterId,
});

export const CreateTaskSchema = z.object({
  listId: z.number().int().positive(),
  title: TaskTitle,
  priority: TaskPriority.optional(),
});

export const UpdateTaskSchema = z.object({
  title: TaskTitle.optional(),
  priority: TaskPriority.optional(),
  done: z.boolean().optional(),
  archived: z.boolean().optional(),
  listId: z.number().int().positive().optional(),
  afterId: AfterId,
});

export const BatchArchiveTasksSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(500),
  archived: z.boolean(),
});
