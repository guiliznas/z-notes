import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { makeTestApp, loginWithGoogle, type TestApp } from "../test-helpers.js";

const PROFILE_B = { sub: "google-sub-2", email: "user2@example.com", name: "User Dois" };

describe("rotas de tarefas", () => {
  let t: TestApp;
  let cookieB: string;
  let folderId: number;
  let listId: number;
  let list2Id: number;

  beforeEach(async () => {
    t = await makeTestApp();
    cookieB = (await loginWithGoogle(t.app, PROFILE_B)).cookie;
    folderId = (await post("/api/task-folders", { name: "Lançamento v2" })).json().id;
    listId = (await post("/api/task-lists", { folderId, name: "A fazer" })).json().id;
    list2Id = (await post("/api/task-lists", { folderId, name: "Em andamento" })).json().id;
  });
  afterEach(async () => {
    await t.cleanup();
  });

  const call = (method: "GET" | "POST" | "PATCH" | "DELETE", url: string, cookie = t.cookie, payload?: unknown) =>
    t.app.inject({ method, url, headers: { cookie }, ...(payload !== undefined ? { payload: payload as object } : {}) });
  const post = (url: string, payload: unknown, cookie = t.cookie) => call("POST", url, cookie, payload);
  const patch = (url: string, payload: unknown, cookie = t.cookie) => call("PATCH", url, cookie, payload);
  const get = (url: string, cookie = t.cookie) => call("GET", url, cookie);
  const del = (url: string, cookie = t.cookie) => call("DELETE", url, cookie);

  it("exige autenticação em todas as rotas de tarefas", async () => {
    for (const [method, url] of [
      ["GET", "/api/task-folders"],
      ["GET", `/api/task-folders/${folderId}/board`],
      ["POST", "/api/task-lists"],
      ["POST", "/api/tasks"],
      ["POST", "/api/tasks/archive"],
      ["GET", "/api/task-archive"],
    ] as const) {
      const res = await t.app.inject({ method, url });
      expect(res.statusCode, `${method} ${url}`).toBe(401);
    }
  });

  it("fluxo completo: criar, editar, concluir, reordenar, mover e ler o quadro", async () => {
    const a = (await post("/api/tasks", { listId, title: "  Testar deep link  ", priority: "high" })).json();
    expect(a.title).toBe("Testar deep link");
    expect(a.priority).toBe("high");
    const b = (await post("/api/tasks", { listId, title: "Revisar textos" })).json();

    expect((await patch(`/api/tasks/${b.id}`, { done: true })).json().done).toBe(true);
    expect((await patch(`/api/tasks/${a.id}`, { listId: list2Id })).json().listId).toBe(list2Id);
    await patch(`/api/tasks/${b.id}`, { afterId: null });

    const board = (await get(`/api/task-folders/${folderId}/board`)).json();
    expect(board.folder.name).toBe("Lançamento v2");
    expect(board.lists.map((l: { name: string }) => l.name)).toEqual(["A fazer", "Em andamento"]);
    expect(board.lists[0].tasks.map((x: { id: number }) => x.id)).toEqual([b.id]);
    expect(board.lists[1].tasks.map((x: { id: number }) => x.id)).toEqual([a.id]);

    const folders = (await get("/api/task-folders")).json();
    expect(folders[0]).toMatchObject({ id: folderId, openCount: 1 });
  });

  it("valida entradas: título vazio, longo, prioridade inválida, ids ruins (400)", async () => {
    expect((await post("/api/tasks", { listId, title: "   " })).statusCode).toBe(400);
    expect((await post("/api/tasks", { listId, title: "x".repeat(501) })).statusCode).toBe(400);
    expect((await post("/api/tasks", { listId, title: "ok", priority: "urgente" })).statusCode).toBe(400);
    expect((await post("/api/task-folders", { name: "" })).statusCode).toBe(400);
    expect((await post("/api/task-lists", { folderId: "x", name: "L" })).statusCode).toBe(400);
    expect((await post("/api/tasks/archive", { ids: [], archived: true })).statusCode).toBe(400);
    expect((await get("/api/task-folders?view=outra")).statusCode).toBe(400);
    expect((await get("/api/task-folders/abc/board")).statusCode).toBe(400);
  });

  it("Arquivar concluídas + Desfazer pelo HTTP", async () => {
    const ids: number[] = [];
    for (const title of ["A", "B", "C"]) {
      const task = (await post("/api/tasks", { listId, title })).json();
      ids.push(task.id);
    }
    await patch(`/api/tasks/${ids[0]}`, { done: true });
    await patch(`/api/tasks/${ids[2]}`, { done: true });

    const res = await post(`/api/task-lists/${listId}/archive-completed`, {});
    expect(res.statusCode).toBe(200);
    expect(res.json().ids.sort()).toEqual([ids[0], ids[2]].sort());

    let board = (await get(`/api/task-folders/${folderId}/board`)).json();
    expect(board.lists[0].tasks.map((x: { id: number }) => x.id)).toEqual([ids[1]]);
    const archive = (await get("/api/task-archive")).json();
    expect(archive.tasks.map((x: { id: number }) => x.id).sort()).toEqual([ids[0], ids[2]].sort());

    const undo = await post("/api/tasks/archive", { ids: res.json().ids, archived: false });
    expect(undo.statusCode).toBe(200);
    board = (await get(`/api/task-folders/${folderId}/board`)).json();
    expect(board.lists[0].tasks.map((x: { id: number }) => x.id)).toEqual(ids);
  });

  it("arquivar e restaurar pasta e lista pelo HTTP", async () => {
    await patch(`/api/task-lists/${listId}`, { archived: true });
    expect((await get(`/api/task-folders/${folderId}/board`)).json().lists).toHaveLength(1);
    expect((await get("/api/task-archive")).json().lists[0]).toMatchObject({ id: listId, folderName: "Lançamento v2" });
    await patch(`/api/task-lists/${listId}`, { archived: false });

    await patch(`/api/task-folders/${folderId}`, { archived: true });
    expect((await get("/api/task-folders")).json()).toEqual([]);
    expect((await get("/api/task-folders?view=archived")).json()).toHaveLength(1);
    await patch(`/api/task-folders/${folderId}`, { archived: false });
    expect((await get("/api/task-folders")).json()).toHaveLength(1);
  });

  it("exclusões devolvem 204 e a pasta leva listas e tarefas junto", async () => {
    const task = (await post("/api/tasks", { listId, title: "x" })).json();
    expect((await del(`/api/tasks/${task.id}`)).statusCode).toBe(204);
    expect((await del(`/api/task-lists/${list2Id}`)).statusCode).toBe(204);
    expect((await del(`/api/task-folders/${folderId}`)).statusCode).toBe(204);
    expect((await get(`/api/task-folders/${folderId}/board`)).statusCode).toBe(404);
  });

  it("outro usuário recebe 404 em tudo (nunca 403) e não altera nada", async () => {
    const task = (await post("/api/tasks", { listId, title: "privada" })).json();

    expect((await get("/api/task-folders", cookieB)).json()).toEqual([]);
    for (const [method, url, payload] of [
      ["GET", `/api/task-folders/${folderId}/board`, undefined],
      ["PATCH", `/api/task-folders/${folderId}`, { name: "x" }],
      ["DELETE", `/api/task-folders/${folderId}`, undefined],
      ["POST", "/api/task-lists", { folderId, name: "x" }],
      ["PATCH", `/api/task-lists/${listId}`, { archived: true }],
      ["DELETE", `/api/task-lists/${listId}`, undefined],
      ["POST", `/api/task-lists/${listId}/archive-completed`, {}],
      ["POST", "/api/tasks", { listId, title: "x" }],
      ["PATCH", `/api/tasks/${task.id}`, { title: "hack" }],
      ["DELETE", `/api/tasks/${task.id}`, undefined],
      ["POST", "/api/tasks/archive", { ids: [task.id], archived: true }],
    ] as const) {
      const res = await call(method, url, cookieB, payload);
      expect(res.statusCode, `${method} ${url}`).toBe(404);
    }
    expect((await get("/api/task-archive", cookieB)).json()).toEqual({ folders: [], lists: [], tasks: [] });

    const board = (await get(`/api/task-folders/${folderId}/board`)).json();
    expect(board.lists[0].tasks[0].title).toBe("privada");
  });
});
