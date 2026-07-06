import { z } from "zod";

export const LoginSchema = z.object({
  password: z.string().min(1, "Senha é obrigatória"),
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
});

export const ListNotesQuery = z.object({
  folder: z.coerce.number().int().positive().optional(),
  view: z.enum(["active", "archived", "trash"]).default("active"),
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
