import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { makeTestCtx, type TestCtx } from "../test-helpers.js";
import { computeFingerprint } from "./fingerprint.js";
import { createFolder } from "../services/folders.js";
import { createNote, updateNote, trashNote, hardDeleteNote } from "../services/notes.js";

describe("computeFingerprint", () => {
  let t: TestCtx;
  beforeEach(() => {
    t = makeTestCtx();
  });
  afterEach(() => {
    t.cleanup();
  });

  it("é estável sem nenhuma mudança", () => {
    const folder = createFolder(t.ctx, { name: "F" });
    createNote(t.ctx, { folderId: folder.id, contentMd: "nota" });
    const fp1 = computeFingerprint(t.ctx);
    const fp2 = computeFingerprint(t.ctx);
    expect(fp1).toBe(fp2);
  });

  it("muda ao criar uma nota", () => {
    const folder = createFolder(t.ctx, { name: "F" });
    const fp1 = computeFingerprint(t.ctx);
    createNote(t.ctx, { folderId: folder.id, contentMd: "nota" });
    const fp2 = computeFingerprint(t.ctx);
    expect(fp2).not.toBe(fp1);
  });

  it("muda ao editar conteúdo", () => {
    const folder = createFolder(t.ctx, { name: "F" });
    const note = createNote(t.ctx, { folderId: folder.id, contentMd: "v1" });
    const fp1 = computeFingerprint(t.ctx);
    updateNote(t.ctx, note.id, { contentMd: "v2", version: note.version });
    const fp2 = computeFingerprint(t.ctx);
    expect(fp2).not.toBe(fp1);
  });

  it("muda ao arquivar", () => {
    const folder = createFolder(t.ctx, { name: "F" });
    const note = createNote(t.ctx, { folderId: folder.id, contentMd: "nota" });
    const fp1 = computeFingerprint(t.ctx);
    updateNote(t.ctx, note.id, { archived: true });
    const fp2 = computeFingerprint(t.ctx);
    expect(fp2).not.toBe(fp1);
  });

  it("muda ao excluir definitivamente (COUNT cobre o caso que MAX(updated_at) não pega)", () => {
    const folder = createFolder(t.ctx, { name: "F" });
    const note = createNote(t.ctx, { folderId: folder.id, contentMd: "nota" });
    trashNote(t.ctx, note.id);
    const fp1 = computeFingerprint(t.ctx);
    hardDeleteNote(t.ctx, note.id);
    const fp2 = computeFingerprint(t.ctx);
    expect(fp2).not.toBe(fp1);
  });
});
