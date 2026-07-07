import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { makeTestCtx, type TestCtx } from "../test-helpers.js";
import { createFolder } from "../services/folders.js";
import { createNote, updateNote } from "../services/notes.js";
import { createSnapshotIfChanged } from "./snapshot.js";
import { applySnapshot } from "./restore.js";

describe("applySnapshot", () => {
  let t: TestCtx;
  beforeEach(() => {
    t = makeTestCtx();
  });
  afterEach(() => {
    t.cleanup();
  });

  it("lança erro se o arquivo de snapshot não existe", async () => {
    await expect(applySnapshot(t.cfg, "/caminho/inexistente.zip")).rejects.toThrow(/não encontrado/);
  });

  it("restaura banco + mirror e preserva o estado anterior em backup de segurança", async () => {
    const folder = createFolder(t.ctx, { name: "Original" });
    const note = createNote(t.ctx, { folderId: folder.id, contentMd: "Estado original\ncorpo" });
    const snapshot = await createSnapshotIfChanged(t.ctx);
    const snapshotPath = path.join(t.cfg.backupDir, snapshot.filename!);

    // Muda o estado depois do snapshot — o mirror-sync renomeia o arquivo (título mudou).
    updateNote(t.ctx, note.id, { contentMd: "Estado modificado\noutro corpo", version: note.version });
    expect(fs.existsSync(path.join(t.cfg.mirrorDir, "Original", "estado-modificado.md"))).toBe(true);

    const { safetyDir } = await applySnapshot(t.cfg, snapshotPath);

    // Backup de segurança preserva o que existia antes do restore (estado modificado).
    expect(fs.existsSync(path.join(safetyDir, "z-notes.db"))).toBe(true);
    expect(fs.readFileSync(path.join(safetyDir, "mirror", "Original", "estado-modificado.md"), "utf8")).toContain(
      "Estado modificado",
    );

    // O mirror restaurado reflete o conteúdo de quando o snapshot foi tirado.
    expect(fs.existsSync(path.join(t.cfg.mirrorDir, "Original", "estado-modificado.md"))).toBe(false);
    const restored = fs.readFileSync(path.join(t.cfg.mirrorDir, "Original", "estado-original.md"), "utf8");
    expect(restored).toContain("Estado original");
  });

  it("remove sidecars -wal/-shm remanescentes do banco anterior", async () => {
    // Regressão: um -wal remanescente (processo encerrado sem fechar a conexão)
    // não pode ser "reaplicado" por cima do banco recém-restaurado.
    const folder = createFolder(t.ctx, { name: "F" });
    const note = createNote(t.ctx, { folderId: folder.id, contentMd: "original" });
    const snapshot = await createSnapshotIfChanged(t.ctx);
    const snapshotPath = path.join(t.cfg.backupDir, snapshot.filename!);
    updateNote(t.ctx, note.id, { contentMd: "editado", version: note.version });

    // Simula um -wal/-shm órfãos com transações não "checkpointadas".
    fs.writeFileSync(`${t.cfg.dbPath}-wal`, "wal-nao-checkpointado");
    fs.writeFileSync(`${t.cfg.dbPath}-shm`, "shm-fake");

    const { safetyDir } = await applySnapshot(t.cfg, snapshotPath);

    expect(fs.existsSync(`${t.cfg.dbPath}-wal`)).toBe(false);
    expect(fs.existsSync(`${t.cfg.dbPath}-shm`)).toBe(false);
    // Os sidecars antigos ficam preservados no backup de segurança, não perdidos.
    expect(fs.readFileSync(path.join(safetyDir, "z-notes.db-wal"), "utf8")).toBe("wal-nao-checkpointado");
  });
});
