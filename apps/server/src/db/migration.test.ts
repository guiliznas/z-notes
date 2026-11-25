import { describe, it, expect, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { openDatabase } from "./bootstrap.js";
import { notes } from "./schema.js";
import { isNull } from "drizzle-orm";

const LEGACY_DDL = `
CREATE TABLE folders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  parent_id INTEGER REFERENCES folders(id),
  position INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  folder_id INTEGER REFERENCES folders(id),
  content_md TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1,
  mirror_path TEXT,
  archived_at INTEGER,
  deleted_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);`;

describe("migração multi-usuário", () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
  });

  it("banco legado ganha user_id sem perder dados", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "z-notes-legacy-"));
    dirs.push(dir);
    const dbPath = path.join(dir, "z-notes.db");

    const legacy = new Database(dbPath);
    legacy.exec(LEGACY_DDL);
    const now = Date.now();
    legacy.exec(
      `INSERT INTO folders (name, parent_id, position, created_at, updated_at) VALUES ('Minhas', NULL, 0, ${now}, ${now})`,
    );
    legacy.exec(
      `INSERT INTO notes (folder_id, content_md, version, created_at, updated_at) VALUES (1, '# Minha nota', 1, ${now}, ${now})`,
    );
    legacy.close();

    const { sqlite, db, migrated } = openDatabase(dbPath);
    try {
      expect(migrated).toBe(true);
      const rows = db.select().from(notes).all();
      expect(rows).toHaveLength(1);
      expect(rows[0].contentMd).toBe("# Minha nota");
      expect(rows[0].userId).toBeNull();
      const orphans = db.select().from(notes).where(isNull(notes.userId)).all();
      expect(orphans).toHaveLength(1);
    } finally {
      sqlite.close();
    }

    // Reabrir é idempotente: nada mais a migrar.
    const reopened = openDatabase(dbPath);
    try {
      expect(reopened.migrated).toBe(false);
    } finally {
      reopened.sqlite.close();
    }
  });

  it("banco novo já nasce com user_id", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "z-notes-fresh-"));
    dirs.push(dir);
    const { sqlite, migrated } = openDatabase(path.join(dir, "z-notes.db"));
    try {
      expect(migrated).toBe(false);
    } finally {
      sqlite.close();
    }
  });

  it("banco sem pinned_at ganha a coluna (nota existente continua não fixada)", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "z-notes-pin-"));
    dirs.push(dir);
    const dbPath = path.join(dir, "z-notes.db");
    const legacy = new Database(dbPath);
    legacy.exec(LEGACY_DDL);
    const now = Date.now();
    legacy.exec(`INSERT INTO folders (name, position, created_at, updated_at) VALUES ('F', 0, ${now}, ${now})`);
    legacy.exec(`INSERT INTO notes (folder_id, content_md, created_at, updated_at) VALUES (1, 'x', ${now}, ${now})`);
    legacy.close();

    const { sqlite, db, migrated } = openDatabase(dbPath);
    try {
      expect(migrated).toBe(true);
      const cols = (sqlite.prepare("PRAGMA table_info(notes)").all() as { name: string }[]).map((c) => c.name);
      expect(cols).toContain("pinned_at");
      expect(db.select().from(notes).all()[0].pinnedAt).toBeNull();
    } finally {
      sqlite.close();
    }
  });
  it("banco com tasks sem content_md ganha a coluna com default vazio (idempotente)", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "z-notes-task-content-"));
    dirs.push(dir);
    const dbPath = path.join(dir, "z-notes.db");
    const legacy = new Database(dbPath);
    // Cria DDL completo legado onde tasks não tem content_md
    legacy.exec(`
      CREATE TABLE users (id INTEGER PRIMARY KEY, google_sub TEXT UNIQUE, email TEXT, created_at INTEGER, updated_at INTEGER);
      CREATE TABLE task_folders (id INTEGER PRIMARY KEY, user_id INTEGER, name TEXT, position REAL, archived_at INTEGER, created_at INTEGER, updated_at INTEGER);
      CREATE TABLE task_lists (id INTEGER PRIMARY KEY, user_id INTEGER, folder_id INTEGER, name TEXT, position REAL, archived_at INTEGER, created_at INTEGER, updated_at INTEGER);
      CREATE TABLE tasks (
        id INTEGER PRIMARY KEY,
        user_id INTEGER,
        list_id INTEGER,
        title TEXT,
        priority TEXT DEFAULT 'none',
        position REAL DEFAULT 0,
        done_at INTEGER,
        archived_at INTEGER,
        created_at INTEGER,
        updated_at INTEGER
      );
    `);
    const now = Date.now();
    legacy.exec(`INSERT INTO users (id, google_sub, email, created_at, updated_at) VALUES (1, 'sub1', 'u@example.com', ${now}, ${now})`);
    legacy.exec(`INSERT INTO task_folders (id, user_id, name, created_at, updated_at) VALUES (1, 1, 'F', ${now}, ${now})`);
    legacy.exec(`INSERT INTO task_lists (id, user_id, folder_id, name, created_at, updated_at) VALUES (1, 1, 1, 'L', ${now}, ${now})`);
    legacy.exec(`INSERT INTO tasks (id, user_id, list_id, title, created_at, updated_at) VALUES (1, 1, 1, 'Tarefa antiga', ${now}, ${now})`);
    legacy.close();

    const { sqlite, migrated } = openDatabase(dbPath);
    try {
      expect(migrated).toBe(true);
      const cols = (sqlite.prepare("PRAGMA table_info(tasks)").all() as { name: string }[]).map((c) => c.name);
      expect(cols).toContain("content_md");
      const row = sqlite.prepare("SELECT * FROM tasks WHERE id = 1").get() as { title: string; content_md: string };
      expect(row.title).toBe("Tarefa antiga");
      expect(row.content_md).toBe("");
    } finally {
      sqlite.close();
    }
  });
});
