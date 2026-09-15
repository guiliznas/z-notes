import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** `sub` do Google (identificador estável da conta). */
  googleSub: text("google_sub").notNull().unique(),
  email: text("email").notNull(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  /** 1 = pode acessar /api/admin/* e a página /admin. Definido via Z_NOTES_ADMIN_EMAILS. */
  isAdmin: integer("is_admin").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

/** Amostras periódicas de métricas p/ o dashboard admin (só-crescente, com retenção). */
export const metricSamples = sqliteTable("metric_samples", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  capturedAt: integer("captured_at").notNull(),
  name: text("name").notNull(),
  value: integer("value").notNull().default(0),
});

export const folders = sqliteTable("folders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** dono da pasta. NULL = legado single-tenant, adotado no primeiro login. */
  userId: integer("user_id"),
  name: text("name").notNull(),
  parentId: integer("parent_id"),
  position: integer("position").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const notes = sqliteTable("notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** dono da nota. NULL = legado single-tenant, adotado no primeiro login. */
  userId: integer("user_id"),
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

export type UserRow = typeof users.$inferSelect;
export type FolderRow = typeof folders.$inferSelect;
export type NoteRow = typeof notes.$inferSelect;
export type MetricSampleRow = typeof metricSamples.$inferSelect;
