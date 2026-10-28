import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";

const DDL = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  google_sub TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  is_admin INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS metric_samples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  captured_at INTEGER NOT NULL,
  name TEXT NOT NULL,
  value INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_metric_samples_name_time ON metric_samples(name, captured_at);

CREATE TABLE IF NOT EXISTS folders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  name TEXT NOT NULL,
  parent_id INTEGER REFERENCES folders(id),
  position INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  folder_id INTEGER REFERENCES folders(id),
  content_md TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1,
  mirror_path TEXT,
  archived_at INTEGER,
  pinned_at INTEGER,
  deleted_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notes_folder ON notes(folder_id);
CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at);

CREATE TABLE IF NOT EXISTS task_folders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  position REAL NOT NULL DEFAULT 0,
  archived_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS task_lists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  folder_id INTEGER NOT NULL REFERENCES task_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position REAL NOT NULL DEFAULT 0,
  archived_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  list_id INTEGER NOT NULL REFERENCES task_lists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'none',
  position REAL NOT NULL DEFAULT 0,
  done_at INTEGER,
  archived_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_task_folders_user ON task_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_task_lists_folder ON task_lists(folder_id);
CREATE INDEX IF NOT EXISTS idx_tasks_list ON tasks(list_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);

CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
  content_md,
  content='notes',
  content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
  INSERT INTO notes_fts(rowid, content_md) VALUES (new.id, new.content_md);
END;

CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
  INSERT INTO notes_fts(notes_fts, rowid, content_md) VALUES('delete', old.id, old.content_md);
END;

CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
  INSERT INTO notes_fts(notes_fts, rowid, content_md) VALUES('delete', old.id, old.content_md);
  INSERT INTO notes_fts(rowid, content_md) VALUES (new.id, new.content_md);
END;
`;

export type Db = BetterSQLite3Database<typeof schema>;
export type Sqlite = Database.Database;

export interface DbHandles {
  sqlite: Sqlite;
  db: Db;
  /** true quando a migração multi-usuário adicionou colunas a um banco legado. */
  migrated: boolean;
}

function hasColumn(sqlite: Sqlite, table: string, column: string): boolean {
  const info = sqlite.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return info.some((c) => c.name === column);
}

/**
 * Migração multi-usuário (idempotente): adiciona `user_id` a bancos criados
 * antes do login Google. Linhas existentes ficam com `user_id` NULL e são
 * adotadas pelo primeiro usuário que logar (ver `adoptOrphanData`).
 * Retorna true se alguma coluna foi adicionada.
 */
function migrateUserColumns(sqlite: Sqlite): boolean {
  let migrated = false;
  if (!hasColumn(sqlite, "notes", "user_id")) {
    sqlite.exec("ALTER TABLE notes ADD COLUMN user_id INTEGER REFERENCES users(id)");
    migrated = true;
  }
  if (!hasColumn(sqlite, "folders", "user_id")) {
    sqlite.exec("ALTER TABLE folders ADD COLUMN user_id INTEGER REFERENCES users(id)");
    migrated = true;
  }
  if (!hasColumn(sqlite, "users", "is_admin")) {
    sqlite.exec("ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0");
    migrated = true;
  }
  if (!hasColumn(sqlite, "notes", "pinned_at")) {
    sqlite.exec("ALTER TABLE notes ADD COLUMN pinned_at INTEGER");
    migrated = true;
  }
  return migrated;
}

const USER_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_user ON folders(user_id);
`;

/** Abre (ou cria) o banco no caminho dado e garante o schema + FTS. */
export function openDatabase(dbPath: string): DbHandles {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(DDL);
  const migrated = migrateUserColumns(sqlite);
  // Índices sobre user_id SÓ depois do ALTER: em banco legado a coluna ainda não existe.
  sqlite.exec(USER_INDEXES);
  const db = drizzle(sqlite, { schema });
  return { sqlite, db, migrated };
}
