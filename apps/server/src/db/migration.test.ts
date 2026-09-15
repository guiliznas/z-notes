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
});
