import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { makeTestApp, type TestApp } from "../test-helpers.js";

describe("folders", () => {
  let t: TestApp;
  beforeEach(async () => {
    t = await makeTestApp();
  });
  afterEach(async () => {
    await t.cleanup();
  });

  const post = (url: string, payload: Record<string, unknown>) =>
    t.app.inject({ method: "POST", url, payload, headers: { cookie: t.cookie } });
  const get = (url: string) => t.app.inject({ method: "GET", url, headers: { cookie: t.cookie } });

  it("cria pasta raiz e subpasta", async () => {
    const root = await post("/api/folders", { name: "Trabalho" });
    expect(root.statusCode).toBe(201);
    const rootId = root.json().id;
    const sub = await post("/api/folders", { name: "Reuniões", parentId: rootId });
    expect(sub.statusCode).toBe(201);

    const tree = (await get("/api/folders")).json();
    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe("Trabalho");
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].name).toBe("Reuniões");
  });

  it("rejeita aninhamento de 2 níveis", async () => {
    const root = await post("/api/folders", { name: "A" });
    const sub = await post("/api/folders", { name: "B", parentId: root.json().id });
    const deep = await post("/api/folders", { name: "C", parentId: sub.json().id });
    expect(deep.statusCode).toBe(400);
  });

  it("conta notas ativas na pasta", async () => {
    const root = await post("/api/folders", { name: "Notas" });
    const fid = root.json().id;
    await post("/api/notes", { folderId: fid, contentMd: "Uma" });
    await post("/api/notes", { folderId: fid, contentMd: "Duas" });
    const tree = (await get("/api/folders")).json();
    expect(tree[0].noteCount).toBe(2);
  });

  it("excluir pasta manda notas para a lixeira", async () => {
    const root = await post("/api/folders", { name: "Temp" });
    const fid = root.json().id;
    await post("/api/notes", { folderId: fid, contentMd: "vai pra lixeira" });
    const del = await t.app.inject({ method: "DELETE", url: `/api/folders/${fid}`, headers: { cookie: t.cookie } });
    expect(del.statusCode).toBe(204);

    const tree = (await get("/api/folders")).json();
    expect(tree).toHaveLength(0);
    const trash = (await get("/api/notes?view=trash")).json();
    expect(trash).toHaveLength(1);
    expect(trash[0].deleted).toBe(true);
  });
});
