import { describe, it, expect, beforeEach, afterEach } from "vitest";
import JSZip from "jszip";
import { makeTestCtx, type TestCtx } from "../test-helpers.js";
import { parseFrontmatter, zipToEntries, importEntries, exportZip } from "./io.js";
import { listFolderTree } from "./folders.js";
import { listNotes } from "./notes.js";

describe("parseFrontmatter", () => {
  it("extrai datas e remove o bloco", () => {
    const raw = "---\nid: 1\ncreated: 2020-01-01T00:00:00.000Z\nupdated: 2021-06-01T00:00:00.000Z\narchived: false\n---\nCorpo aqui";
    const parsed = parseFrontmatter(raw);
    expect(parsed.body).toBe("Corpo aqui");
    expect(parsed.createdAt).toBe(Date.parse("2020-01-01T00:00:00.000Z"));
    expect(parsed.updatedAt).toBe(Date.parse("2021-06-01T00:00:00.000Z"));
  });

  it("mantém conteúdo sem frontmatter", () => {
    const parsed = parseFrontmatter("Sem frontmatter\nlinha");
    expect(parsed.body).toBe("Sem frontmatter\nlinha");
    expect(parsed.createdAt).toBeUndefined();
  });
});

describe("import/export", () => {
  let t: TestCtx;
  beforeEach(() => {
    t = makeTestCtx();
  });
  afterEach(() => {
    t.cleanup();
  });

  it("importa zip preservando estrutura de pastas", async () => {
    const zip = new JSZip();
    zip.file("Trabalho/Reunioes/ata.md", "Ata da reunião\ndetalhes");
    zip.file("Pessoal/lista.md", "Lista\nitem");
    const buffer = await zip.generateAsync({ type: "nodebuffer" });

    const entries = await zipToEntries(buffer);
    const result = importEntries(t.ctx, entries);
    expect(result.notesImported).toBe(2);

    const tree = listFolderTree(t.ctx);
    const trabalho = tree.find((f) => f.name === "Trabalho");
    expect(trabalho).toBeDefined();
    expect(trabalho!.children.map((c) => c.name)).toContain("Reunioes");
  });

  it("achata níveis além do segundo", async () => {
    const entries = [{ folderSegments: ["A", "B", "C", "D"], content: "Nota\nx" }];
    importEntries(t.ctx, entries);
    const tree = listFolderTree(t.ctx);
    const a = tree.find((f) => f.name === "A");
    expect(a).toBeDefined();
    expect(a!.children).toHaveLength(1);
    expect(a!.children[0].name).toBe("B — C — D");
  });

  it("arquivos soltos vão para Importados", async () => {
    const entries = [{ folderSegments: [], content: "Solta\ncorpo" }];
    importEntries(t.ctx, entries);
    const tree = listFolderTree(t.ctx);
    expect(tree.map((f) => f.name)).toContain("Importados");
  });

  it("exporta zip com os arquivos do espelho", async () => {
    importEntries(t.ctx, [{ folderSegments: ["Pasta"], content: "Nota Export\ncorpo" }]);
    const buffer = await exportZip(t.ctx);
    const zip = await JSZip.loadAsync(buffer);
    const names = Object.keys(zip.files).filter((n) => n.endsWith(".md"));
    expect(names).toContain("Pasta/nota-export.md");
  });

  it("preserva datas do frontmatter na importação", () => {
    const content = "---\ncreated: 2019-05-05T00:00:00.000Z\nupdated: 2019-05-05T00:00:00.000Z\n---\nAntiga";
    importEntries(t.ctx, [{ folderSegments: ["Velhas"], content }]);
    const tree = listFolderTree(t.ctx);
    const folder = tree.find((f) => f.name === "Velhas")!;
    const notes = listNotes(t.ctx, { folderId: folder.id, view: "active" });
    expect(notes[0].createdAt).toBe(Date.parse("2019-05-05T00:00:00.000Z"));
  });
});
