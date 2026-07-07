import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { makeTestCtx, type TestCtx } from "../test-helpers.js";
import { createFolder } from "../services/folders.js";
import { createNote } from "../services/notes.js";
import { createSnapshotIfChanged } from "./snapshot.js";
import { readManifest, writeManifest } from "./manifest.js";

describe("createSnapshotIfChanged", () => {
  let t: TestCtx;
  beforeEach(() => {
    t = makeTestCtx();
  });
  afterEach(() => {
    t.cleanup();
  });

  it("cria um snapshot com banco + mirror na primeira execução", async () => {
    const folder = createFolder(t.ctx, { name: "Trabalho" });
    createNote(t.ctx, { folderId: folder.id, contentMd: "Nota\ncorpo" });

    const result = await createSnapshotIfChanged(t.ctx);
    expect(result.created).toBe(true);
    expect(result.filename).toMatch(/\.zip$/);

    const zipPath = path.join(t.cfg.backupDir, result.filename!);
    expect(fs.existsSync(zipPath)).toBe(true);

    const zip = await JSZip.loadAsync(fs.readFileSync(zipPath));
    expect(Object.keys(zip.files)).toContain("z-notes.db");
    expect(Object.keys(zip.files).some((f) => f.startsWith("mirror/Trabalho/"))).toBe(true);

    const manifest = readManifest(t.cfg.backupDir);
    expect(manifest.snapshots).toHaveLength(1);
    expect(manifest.snapshots[0].filename).toBe(result.filename);
  });

  it("não gera novo snapshot se nada mudou", async () => {
    createFolder(t.ctx, { name: "F" });
    const first = await createSnapshotIfChanged(t.ctx);
    expect(first.created).toBe(true);

    const second = await createSnapshotIfChanged(t.ctx);
    expect(second.created).toBe(false);

    expect(readManifest(t.cfg.backupDir).snapshots).toHaveLength(1);
  });

  it("gera novo snapshot quando algo muda", async () => {
    const folder = createFolder(t.ctx, { name: "F" });
    await createSnapshotIfChanged(t.ctx);

    createNote(t.ctx, { folderId: folder.id, contentMd: "nova nota" });
    const second = await createSnapshotIfChanged(t.ctx);
    expect(second.created).toBe(true);

    expect(readManifest(t.cfg.backupDir).snapshots).toHaveLength(2);
  });

  it("aplica a retenção sobre snapshots antigos ao gerar um novo", async () => {
    const folder = createFolder(t.ctx, { name: "F" });
    await createSnapshotIfChanged(t.ctx);

    // Seed manual: dois snapshots "antigos" (janeiro/2020, mesmo mês-bucket).
    // A limpeza deve manter só o mais recente do bucket mensal.
    const oldOlder = "fake-old-1.zip";
    const oldNewer = "fake-old-2.zip";
    fs.writeFileSync(path.join(t.cfg.backupDir, oldOlder), "fake");
    fs.writeFileSync(path.join(t.cfg.backupDir, oldNewer), "fake");
    const manifest = readManifest(t.cfg.backupDir);
    manifest.snapshots.unshift(
      { filename: oldOlder, createdAt: Date.UTC(2020, 0, 10), fingerprint: "fp-a" },
      { filename: oldNewer, createdAt: Date.UTC(2020, 0, 20), fingerprint: "fp-b" },
    );
    writeManifest(t.cfg.backupDir, manifest);

    createNote(t.ctx, { folderId: folder.id, contentMd: "dispara mudança" });
    await createSnapshotIfChanged(t.ctx);

    const finalManifest = readManifest(t.cfg.backupDir);
    const names = finalManifest.snapshots.map((s) => s.filename);
    expect(names).not.toContain(oldOlder);
    expect(names).toContain(oldNewer);
    expect(fs.existsSync(path.join(t.cfg.backupDir, oldOlder))).toBe(false);
    expect(fs.existsSync(path.join(t.cfg.backupDir, oldNewer))).toBe(true);
  });
});
