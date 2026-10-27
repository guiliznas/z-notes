import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { makeTestCtx, type TestCtx } from "../test-helpers.js";
import { createFolder } from "./folders.js";
import { createNote, updateNote, listNotes, trashNote, getNote } from "./notes.js";
import { searchNotes } from "./search.js";
import { upsertUserByGoogle } from "../auth/users.js";
import { computeFingerprint } from "../backup/fingerprint.js";
import { listMirror } from "../test-helpers.js";

describe("notas fixadas", () => {
  let t: TestCtx;
  beforeEach(() => {
    t = makeTestCtx();
  });
  afterEach(() => {
    t.cleanup();
  });

  function seed() {
    const a = createFolder(t.ctx, { name: "Trabalho" });
    const b = createFolder(t.ctx, { name: "Pessoal" });
    const n1 = createNote(t.ctx, { folderId: a.id, contentMd: "# Projeto X" });
    const n2 = createNote(t.ctx, { folderId: b.id, contentMd: "# Compras" });
    const n3 = createNote(t.ctx, { folderId: a.id, contentMd: "# Rascunho" });
    return { a, b, n1, n2, n3 };
  }

  it("nota nasce não fixada", () => {
    const { n1 } = seed();
    expect(n1.pinned).toBe(false);
  });

  it("fixar e desafixar alternam o flag", () => {
    const { n1 } = seed();
    expect(updateNote(t.ctx, n1.id, { pinned: true }).pinned).toBe(true);
    expect(getNote(t.ctx, n1.id).pinned).toBe(true);
    expect(updateNote(t.ctx, n1.id, { pinned: false }).pinned).toBe(false);
  });

  it("fixar não muda versão nem updatedAt (não gera conflito no editor aberto)", () => {
    const { n1 } = seed();
    const after = updateNote(t.ctx, n1.id, { pinned: true });
    expect(after.version).toBe(n1.version);
    expect(after.updatedAt).toBe(n1.updatedAt);
  });

  it("fixar com version desatualizada não dá conflito", () => {
    const { n1 } = seed();
    updateNote(t.ctx, n1.id, { contentMd: "# Projeto X v2", version: 1 });
    expect(() => updateNote(t.ctx, n1.id, { pinned: true, version: 1 })).not.toThrow();
  });

  it("fixar junto com edição de conteúdo ainda incrementa a versão", () => {
    const { n1 } = seed();
    const after = updateNote(t.ctx, n1.id, { pinned: true, contentMd: "# Novo", version: 1 });
    expect(after.pinned).toBe(true);
    expect(after.version).toBe(2);
  });

  it("view=pinned lista só fixadas e ativas, de todas as pastas, mais recente primeiro", () => {
    const { n1, n2, n3 } = seed();
    updateNote(t.ctx, n1.id, { pinned: true });
    updateNote(t.ctx, n2.id, { pinned: true });
    updateNote(t.ctx, n2.id, { contentMd: "# Compras (editada)" });
    const ids = listNotes(t.ctx, { view: "pinned" }).map((n) => n.id);
    expect(ids).toEqual([n2.id, n1.id]);
    expect(ids).not.toContain(n3.id);
  });

  it("fixada arquivada ou na lixeira some da view=pinned", () => {
    const { n1, n2 } = seed();
    updateNote(t.ctx, n1.id, { pinned: true });
    updateNote(t.ctx, n2.id, { pinned: true });
    updateNote(t.ctx, n1.id, { archived: true });
    trashNote(t.ctx, n2.id);
    expect(listNotes(t.ctx, { view: "pinned" })).toHaveLength(0);
    updateNote(t.ctx, n1.id, { archived: false });
    expect(listNotes(t.ctx, { view: "pinned" }).map((n) => n.id)).toEqual([n1.id]);
  });

  it("listas normais expõem o flag pinned", () => {
    const { a, n1 } = seed();
    updateNote(t.ctx, n1.id, { pinned: true });
    const list = listNotes(t.ctx, { view: "active", folderId: a.id });
    expect(list.find((n) => n.id === n1.id)?.pinned).toBe(true);
    expect(list.filter((n) => n.pinned)).toHaveLength(1);
  });

  it("busca devolve o flag pinned", () => {
    const { n1 } = seed();
    updateNote(t.ctx, n1.id, { pinned: true });
    const hit = searchNotes(t.ctx, "Projeto").find((h) => h.note.id === n1.id);
    expect(hit?.note.pinned).toBe(true);
  });

  it("não vaza fixadas de outro usuário", () => {
    const { n1 } = seed();
    updateNote(t.ctx, n1.id, { pinned: true });
    const other = upsertUserByGoogle(t.ctx, { sub: "outro", email: "outro@example.com" });
    const otherCtx = { ...t.ctx, userId: other.id };
    expect(listNotes(otherCtx, { view: "pinned" })).toHaveLength(0);
    expect(() => updateNote(otherCtx, n1.id, { pinned: true })).toThrow();
  });

  it("fixar não reescreve o espelho .md", () => {
    const { n1 } = seed();
    const before = listMirror(t.cfg, t.userId);
    updateNote(t.ctx, n1.id, { pinned: true });
    expect(listMirror(t.cfg, t.userId)).toEqual(before);
  });

  it("fixar muda o fingerprint do backup (senão o snapshot diário ignoraria a mudança)", () => {
    const { n1 } = seed();
    const before = computeFingerprint(t.ctx);
    updateNote(t.ctx, n1.id, { pinned: true });
    const pinnedFp = computeFingerprint(t.ctx);
    expect(pinnedFp).not.toBe(before);
    updateNote(t.ctx, n1.id, { pinned: false });
    expect(computeFingerprint(t.ctx)).not.toBe(pinnedFp);
  });
});
