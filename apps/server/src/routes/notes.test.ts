import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { makeTestApp, listMirror, type TestApp } from "../test-helpers.js";

describe("notes", () => {
  let t: TestApp;
  let folderId: number;

  beforeEach(async () => {
    t = await makeTestApp();
    const root = await t.app.inject({
      method: "POST",
      url: "/api/folders",
      payload: { name: "Trabalho" },
      headers: { cookie: t.cookie },
    });
    folderId = root.json().id;
  });
  afterEach(async () => {
    await t.cleanup();
  });

  const post = (url: string, payload: Record<string, unknown>) =>
    t.app.inject({ method: "POST", url, payload, headers: { cookie: t.cookie } });
  const patch = (url: string, payload: Record<string, unknown>) =>
    t.app.inject({ method: "PATCH", url, payload, headers: { cookie: t.cookie } });
  const get = (url: string) => t.app.inject({ method: "GET", url, headers: { cookie: t.cookie } });
  const del = (url: string) => t.app.inject({ method: "DELETE", url, headers: { cookie: t.cookie } });

  it("cria nota e deriva título da primeira linha", async () => {
    const res = await post("/api/notes", { folderId, contentMd: "Título\ncorpo" });
    expect(res.statusCode).toBe(201);
    expect(res.json().title).toBe("Título");
    expect(res.json().version).toBe(1);
  });

  it("escreve arquivo no espelho .md", async () => {
    await post("/api/notes", { folderId, contentMd: "Minha Nota\nlinha" });
    const files = listMirror(t.cfg);
    expect(files).toContain("Trabalho/minha-nota.md");
  });

  it("autosave incrementa versão e detecta conflito", async () => {
    const note = (await post("/api/notes", { folderId, contentMd: "v1" })).json();
    const up = await patch(`/api/notes/${note.id}`, { contentMd: "v2", version: 1 });
    expect(up.statusCode).toBe(200);
    expect(up.json().version).toBe(2);

    const stale = await patch(`/api/notes/${note.id}`, { contentMd: "v3", version: 1 });
    expect(stale.statusCode).toBe(409);
  });

  it("arquivar tira da lista ativa e aparece em arquivadas", async () => {
    const note = (await post("/api/notes", { folderId, contentMd: "arquivar" })).json();
    await patch(`/api/notes/${note.id}`, { archived: true });

    const active = (await get(`/api/notes?folder=${folderId}&view=active`)).json();
    expect(active).toHaveLength(0);
    const archived = (await get("/api/notes?view=archived")).json();
    expect(archived).toHaveLength(1);
    expect(archived[0].archived).toBe(true);
  });

  it("arquivada permanece no espelho na pasta original", async () => {
    const note = (await post("/api/notes", { folderId, contentMd: "perm\nx" })).json();
    await patch(`/api/notes/${note.id}`, { archived: true });
    const files = listMirror(t.cfg);
    expect(files).toContain("Trabalho/perm.md");
  });

  it("lixeira e restauração", async () => {
    const note = (await post("/api/notes", { folderId, contentMd: "temp" })).json();
    await del(`/api/notes/${note.id}`);
    expect(listMirror(t.cfg)).not.toContain("Trabalho/temp.md");

    const trash = (await get("/api/notes?view=trash")).json();
    expect(trash).toHaveLength(1);

    const restored = await post(`/api/notes/${note.id}/restore`, {});
    expect(restored.statusCode).toBe(200);
    expect(restored.json().deleted).toBe(false);
    expect(listMirror(t.cfg)).toContain("Trabalho/temp.md");
  });

  it("exclusão definitiva remove do banco", async () => {
    const note = (await post("/api/notes", { folderId, contentMd: "def" })).json();
    await del(`/api/notes/${note.id}`);
    const hard = await del(`/api/notes/${note.id}?hard=true`);
    expect(hard.statusCode).toBe(204);
    const gone = await get(`/api/notes/${note.id}`);
    expect(gone.statusCode).toBe(404);
    const trash = (await get("/api/notes?view=trash")).json();
    expect(trash).toHaveLength(0);
  });

  it("colisão de título gera sufixo no arquivo", async () => {
    await post("/api/notes", { folderId, contentMd: "Igual" });
    await post("/api/notes", { folderId, contentMd: "Igual" });
    const files = listMirror(t.cfg).filter((f) => f.startsWith("Trabalho/igual"));
    expect(files).toContain("Trabalho/igual.md");
    expect(files).toContain("Trabalho/igual-2.md");
  });
});
