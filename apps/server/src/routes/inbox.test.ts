import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { makeTestApp, loginWithGoogle, type TestApp } from "../test-helpers.js";

const PROFILE_B = { sub: "google-sub-2", email: "user2@example.com", name: "User Dois" };

describe("rotas de inbox", () => {
  let t: TestApp;
  let cookieB: string;
  let userB: number;

  beforeEach(async () => {
    t = await makeTestApp();
    const b = await loginWithGoogle(t.app, PROFILE_B);
    cookieB = b.cookie;
    userB = b.userId;
  });

  afterEach(async () => {
    await t.cleanup();
  });

  const call = (
    method: "GET" | "POST" | "PATCH" | "DELETE",
    url: string,
    cookie = t.cookie,
    payload?: unknown,
  ) =>
    t.app.inject({
      method,
      url,
      headers: { cookie },
      ...(payload !== undefined ? { payload: payload as object } : {}),
    });

  const get = (url: string, cookie = t.cookie) => call("GET", url, cookie);
  const post = (url: string, payload: unknown, cookie = t.cookie) => call("POST", url, cookie, payload);
  const patch = (url: string, payload: unknown, cookie = t.cookie) => call("PATCH", url, cookie, payload);
  const del = (url: string, cookie = t.cookie) => call("DELETE", url, cookie);

  describe("autenticação", () => {
    it("exige autenticação em todas as rotas do inbox", async () => {
      const endpoints = [
        ["GET", "/api/inbox"],
        ["GET", "/api/inbox/count"],
        ["POST", "/api/inbox"],
        ["PATCH", "/api/inbox/1"],
        ["DELETE", "/api/inbox/1"],
        ["POST", "/api/inbox/1/to-task"],
        ["POST", "/api/inbox/1/to-note"],
      ] as const;

      for (const [method, url] of endpoints) {
        const res = await t.app.inject({ method, url });
        expect(res.statusCode, `${method} ${url}`).toBe(401);
      }
    });
  });

  describe("CRUD e respostas HTTP", () => {
    it("POST /api/inbox retorna 201 ao criar e 200 no reenvio com mesmo clientId", async () => {
      const res1 = await post("/api/inbox", {
        clientId: "client-http-1",
        content: "Captura de teste HTTP",
        source: "desktop",
      });
      expect(res1.statusCode).toBe(201);
      const data1 = res1.json();
      expect(data1.id).toBeGreaterThan(0);
      expect(data1.clientId).toBe("client-http-1");
      expect(data1.content).toBe("Captura de teste HTTP");
      expect(data1.source).toBe("desktop");

      const res2 = await post("/api/inbox", {
        clientId: "client-http-1",
        content: "Outro texto",
      });
      expect(res2.statusCode).toBe(200);
      const data2 = res2.json();
      expect(data2.id).toBe(data1.id);
      expect(data2.content).toBe("Captura de teste HTTP");
    });

    it("GET /api/inbox e /api/inbox/count", async () => {
      await post("/api/inbox", { clientId: "c-count-1", content: "Item 1" });
      await post("/api/inbox", { clientId: "c-count-2", content: "Item 2" });

      const countRes = await get("/api/inbox/count");
      expect(countRes.statusCode).toBe(200);
      expect(countRes.json()).toEqual({ count: 2 });

      const listRes = await get("/api/inbox?status=pending");
      expect(listRes.statusCode).toBe(200);
      expect(listRes.json()).toHaveLength(2);
    });

    it("PATCH /api/inbox/:id arquiva e desarquiva", async () => {
      const created = (await post("/api/inbox", { clientId: "c-patch", content: "Arquivar" })).json();

      const patchRes = await patch(`/api/inbox/${created.id}`, { archived: true });
      expect(patchRes.statusCode).toBe(200);
      expect(patchRes.json().archived).toBe(true);

      const unpatchRes = await patch(`/api/inbox/${created.id}`, { archived: false });
      expect(unpatchRes.statusCode).toBe(200);
      expect(unpatchRes.json().archived).toBe(false);
    });

    it("DELETE /api/inbox/:id retorna 204", async () => {
      const created = (await post("/api/inbox", { clientId: "c-del", content: "Excluir" })).json();

      const delRes = await del(`/api/inbox/${created.id}`);
      expect(delRes.statusCode).toBe(204);

      const countRes = await get("/api/inbox/count");
      expect(countRes.json()).toEqual({ count: 0 });
    });

    it("POST /api/inbox/:id/to-task e /to-note convertem com sucesso", async () => {
      const taskFolder = (await post("/api/task-folders", { name: "Projetos" })).json();
      const taskList = (await post("/api/task-lists", { folderId: taskFolder.id, name: "Inbox" })).json();
      const noteFolder = (await post("/api/folders", { name: "Anotações" })).json();

      const item1 = (await post("/api/inbox", { clientId: "c-to-task", content: "Fazer compras\n1kg de arroz" })).json();
      const toTaskRes = await post(`/api/inbox/${item1.id}/to-task`, { listId: taskList.id });
      expect(toTaskRes.statusCode).toBe(200);
      expect(toTaskRes.json().item.resolvedKind).toBe("task");
      expect(toTaskRes.json().task.title).toBe("Fazer compras");

      const item2 = (await post("/api/inbox", { clientId: "c-to-note", content: "Ideia genial\nDetalhes" })).json();
      const toNoteRes = await post(`/api/inbox/${item2.id}/to-note`, { folderId: noteFolder.id });
      expect(toNoteRes.statusCode).toBe(200);
      expect(toNoteRes.json().item.resolvedKind).toBe("note");
      expect(toNoteRes.json().note.title).toBe("Ideia genial");
    });

    it("validação de corpo inválido retorna 400", async () => {
      const resEmpty = await post("/api/inbox", { clientId: "", content: "x" });
      expect(resEmpty.statusCode).toBe(400);

      const resNoContent = await post("/api/inbox", { clientId: "c-invalid", content: "" });
      expect(resNoContent.statusCode).toBe(400);

      const resInvalidSource = await post("/api/inbox", {
        clientId: "c-invalid-source",
        content: "x",
        source: "invalid_source",
      });
      expect(resInvalidSource.statusCode).toBe(400);
    });
  });

  describe("isolamento entre usuários (100%)", () => {
    it("usuário B não vê, edita, exclui nem converte itens de usuário A (404 em tudo)", async () => {
      const itemA = (await post("/api/inbox", { clientId: "item-a", content: "Confidencial de A" })).json();

      // B não lista o item de A
      const listB = await get("/api/inbox", cookieB);
      expect(listB.json()).toEqual([]);

      // B tem contagem 0
      const countB = await get("/api/inbox/count", cookieB);
      expect(countB.json()).toEqual({ count: 0 });

      // B não pode editar (404)
      const patchB = await patch(`/api/inbox/${itemA.id}`, { archived: true }, cookieB);
      expect(patchB.statusCode).toBe(404);

      // B não pode excluir (404)
      const delB = await del(`/api/inbox/${itemA.id}`, cookieB);
      expect(delB.statusCode).toBe(404);

      // B cria suas próprias listas e pastas
      const folderB = (await post("/api/folders", { name: "Pasta B" }, cookieB)).json();
      const taskFolderB = (await post("/api/task-folders", { name: "Quadro B" }, cookieB)).json();
      const taskListB = (await post("/api/task-lists", { folderId: taskFolderB.id, name: "Lista B" }, cookieB)).json();

      // B não pode converter o item de A para suas próprias listas (404)
      const toTaskB = await post(`/api/inbox/${itemA.id}/to-task`, { listId: taskListB.id }, cookieB);
      expect(toTaskB.statusCode).toBe(404);

      const toNoteB = await post(`/api/inbox/${itemA.id}/to-note`, { folderId: folderB.id }, cookieB);
      expect(toNoteB.statusCode).toBe(404);
    });

    it("usuário A não pode converter para lista ou pasta pertencente a outro usuário (400)", async () => {
      const itemA = (await post("/api/inbox", { clientId: "item-cross", content: "Tentativa cross" })).json();

      const folderB = (await post("/api/folders", { name: "Pasta B" }, cookieB)).json();
      const taskFolderB = (await post("/api/task-folders", { name: "Quadro B" }, cookieB)).json();
      const taskListB = (await post("/api/task-lists", { folderId: taskFolderB.id, name: "Lista B" }, cookieB)).json();

      // A tenta converter para a lista de B -> 400
      const toTaskCross = await post(`/api/inbox/${itemA.id}/to-task`, { listId: taskListB.id });
      expect(toTaskCross.statusCode).toBe(400);

      // A tenta converter para a pasta de B -> 400
      const toNoteCross = await post(`/api/inbox/${itemA.id}/to-note`, { folderId: folderB.id });
      expect(toNoteCross.statusCode).toBe(400);
    });

    it("mesmo clientId para usuários diferentes não conflita", async () => {
      const resA = await post("/api/inbox", { clientId: "shared-uuid", content: "De A" });
      expect(resA.statusCode).toBe(201);

      const resB = await post("/api/inbox", { clientId: "shared-uuid", content: "De B" }, cookieB);
      expect(resB.statusCode).toBe(201);
      expect(resB.json().id).not.toBe(resA.json().id);
    });
  });
});
