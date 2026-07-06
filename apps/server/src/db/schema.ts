import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const folders = sqliteTable("folders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  parentId: integer("parent_id"),
  position: integer("position").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const notes = sqliteTable("notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** null = nota órfã na lixeira (pasta foi excluída). */
  folderId: integer("folder_id"),
  contentMd: text("content_md").notNull().default(""),
  version: integer("version").notNull().default(1),
  /** caminho relativo do arquivo no espelho .md, ou null se não espelhada. */
  mirrorPath: text("mirror_path"),
  archivedAt: integer("archived_at"),
  deletedAt: integer("deleted_at"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export type FolderRow = typeof folders.$inferSelect;
export type NoteRow = typeof notes.$inferSelect;
