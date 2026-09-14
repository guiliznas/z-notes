import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { makeTestApp, loginWithGoogle, listMirror, type TestApp } from "../test-helpers.js";

const PROFILE_B = { sub: "google-sub-2", email: "user2@example.com", name: "User Dois" };

describe("isolamento entre usuários", () => {
  let t: TestApp;
  let cookieB: string;
  let userB: number;
  let folderA: number;
  let noteA: number;

  beforeEach(async () => {
    t = await makeTestApp();
    const b = await loginWithGoogle(t.app, PROFILE_B);
    cookieB = b.cookie;
    userB = b.userId;

    const folder = await t.app.inject({
      method: "POST",
      url: "/api/folders",
      payload: { name: "Privado-A" },
      headers: { cookie: t.cookie },
    });
    folderA = folder.json().id;
    const note = await t.app.inject({
      method: "POST",
      url: "/api/notes",
      payload: { folderId: folderA, contentMd: "Segredo de A\nconteúdo confidencial" },
      headers: { cookie: t.cookie },
    });
    noteA = note.json().id;
  });
  afterEach(async () => {
    await t.cleanup();
  });

  const asB = (opts: { method: "GET" | "POST" | "PATCH" | "DELETE"; url: string; payload?: Record<string, unknown> }) =>
    t.app.inject({ ...opts, headers: { cookie: cookieB } });

  it("B não lista nada de A", async () => {
    expect((await asB({ method: "GET", url: "/api/notes?view=active" })).json()).toEqual([]);
    expect((await asB({ method: "GET", url: "/api/folders" })).json()).toEqual([]);
    expect((await asB({ method: "GET", url: "/api/search?q=Segredo" })).json()).toEqual([]);
  });

  it("acesso direto a nota/pasta de A retorna 404 (não 403)", async () => {
    expect((await asB({ method: "GET", url: `/api/notes/${noteA}` })).statusCode).toBe(404);
    expect((await asB({ method: "PATCH", url: `/api/notes/${noteA}`, payload: { contentMd: "roubo" } })).statusCode).toBe(
      404,
    );
    expect((await asB({ method: "DELETE", url: `/api/notes/${noteA}` })).statusCode).toBe(404);
    expect((await asB({ method: "PATCH", url: `/api/folders/${folderA}`, payload: { name: "roubo" } })).statusCode).toBe(
      404,
    );
    expect((await asB({ method: "DELETE", url: `/api/folders/${folderA}` })).statusCode).toBe(404);
  });

  it("B não cria nota na pasta de A", async () => {
    const res = await asB({ method: "POST", url: "/api/notes", payload: { folderId: folderA, contentMd: "x" } });
    expect(res.statusCode).toBe(400);
  });

  it("restore e hardDelete de outro retornam 404", async () => {
    expect((await asB({ method: "POST", url: `/api/notes/${noteA}/restore`, payload: {} })).statusCode).toBe(404);
    expect((await asB({ method: "DELETE", url: `/api/notes/${noteA}?hard=true` })).statusCode).toBe(404);
  });

  it("busca com filtro de pasta alheia não vaza nada", async () => {
    const res = await asB({ method: "GET", url: `/api/search?q=Segredo&folder=${folderA}` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it("export de B responde zip (conteúdo provado no nível de serviço)", async () => {
    // O inject corrompe binário em string: aqui vale status + headers.
    // O escopo do conteúdo está em io.test.ts > "exportZip contém só arquivos do usuário".
    const res = await asB({ method: "GET", url: "/api/export" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("application/zip");
    expect(res.headers["content-disposition"]).toContain("z-notes-backup.zip");
  });

  it("espelhos em disco são separados por usuário", async () => {
    const folderB = (
      await asB({ method: "POST", url: "/api/folders", payload: { name: "Privado-A" } })
    ).json().id;
    await asB({ method: "POST", url: "/api/notes", payload: { folderId: folderB, contentMd: "Segredo de A" } });

    const filesA = listMirror(t.cfg, t.userId);
    const filesB = listMirror(t.cfg, userB);
    expect(filesA).toContain("Privado-A/segredo-de-a.md");
    expect(filesB).toContain("Privado-A/segredo-de-a.md");
    expect(filesA).toHaveLength(1);
    expect(filesB).toHaveLength(1);
  });

  it("A continua vendo os próprios dados após ações de B", async () => {
    await asB({ method: "DELETE", url: `/api/notes/${noteA}` });
    const note = await t.app.inject({ method: "GET", url: `/api/notes/${noteA}`, headers: { cookie: t.cookie } });
    expect(note.statusCode).toBe(200);
    expect(note.json().contentMd).toContain("Segredo de A");
  });
});
