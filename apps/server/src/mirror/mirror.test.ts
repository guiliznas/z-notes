import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { slugify, sanitizeSegment } from "./mirror.js";
import { makeTestCtx, listMirror, readMirror, type TestCtx } from "../test-helpers.js";
import { createFolder, updateFolder } from "../services/folders.js";
import { createNote } from "../services/notes.js";

describe("slugify", () => {
  it("remove acentos e normaliza", () => {
    expect(slugify("Reunião de Estratégia")).toBe("reuniao-de-estrategia");
  });
  it("usa fallback para vazio", () => {
    expect(slugify("!!!")).toBe("sem-titulo");
  });
});

describe("sanitizeSegment", () => {
  it("mantém acentos, remove caracteres inválidos", () => {
    expect(sanitizeSegment("Pesquisa/2024")).toBe("Pesquisa-2024");
    expect(sanitizeSegment("Trabalho")).toBe("Trabalho");
  });
});

describe("mirror rebuild em mudança de pasta", () => {
  let t: TestCtx;
  beforeEach(() => {
    t = makeTestCtx();
  });
  afterEach(() => {
    t.cleanup();
  });

  it("renomear pasta move os arquivos no espelho", () => {
    const folder = createFolder(t.ctx, { name: "Antigo" });
    createNote(t.ctx, { folderId: folder.id, contentMd: "Uma nota\ncorpo" });
    expect(listMirror(t.cfg)).toContain("Antigo/uma-nota.md");

    updateFolder(t.ctx, folder.id, { name: "Novo" });
    const files = listMirror(t.cfg);
    expect(files).toContain("Novo/uma-nota.md");
    expect(files).not.toContain("Antigo/uma-nota.md");
  });

  it("frontmatter contém id e archived", () => {
    const folder = createFolder(t.ctx, { name: "F" });
    const note = createNote(t.ctx, { folderId: folder.id, contentMd: "Nota\ncorpo" });
    const content = readMirror(t.cfg, "F/nota.md");
    expect(content).toContain(`id: ${note.id}`);
    expect(content).toContain("archived: false");
    expect(content).toContain("Nota\ncorpo");
  });
});
