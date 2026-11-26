import { describe, it, expect, afterEach, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";
import { makeConfig, type AppConfig } from "../config.js";
import { loginWithGoogle } from "../test-helpers.js";

/** Credencial fictícia, só dos testes. */
const TEST_USER = { username: "revisor", password: "senha-ficticia-de-teste" };

describe("login com usuário e senha (conta de teste)", () => {
  let app: FastifyInstance;
  let cfg: AppConfig;
  let dataDir: string;

  async function start(overrides: Partial<AppConfig> = { testUser: TEST_USER }) {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "z-notes-pw-"));
    cfg = makeConfig({ dataDir, ...overrides });
    cfg.google = { clientId: "id", clientSecret: "secret", callbackUrl: "http://test/callback" };
    app = await buildApp(cfg);
  }

  afterEach(async () => {
    vi.unstubAllGlobals();
    await app.close();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  const login = (payload: object = TEST_USER) =>
    app.inject({ method: "POST", url: "/api/auth/password", payload });
  const bearer = (token: string) => ({ authorization: `Bearer ${token}` });
  const post = (url: string, token: string, payload: object) =>
    app.inject({ method: "POST", url, headers: bearer(token), payload });

  it("devolve um token que acessa a API", async () => {
    await start();
    const res = await login();
    expect(res.statusCode).toBe(200);
    expect(res.json().user).toMatchObject({ name: "revisor", isAdmin: false });
    const { token } = res.json();
    const me = await app.inject({ method: "GET", url: "/api/auth/me", headers: bearer(token) });
    expect(me.json().authenticated).toBe(true);
    const folders = await app.inject({ method: "GET", url: "/api/folders", headers: bearer(token) });
    expect(folders.statusCode).toBe(200);
  });

  it("logins seguidos usam a mesma conta", async () => {
    await start();
    const a = await login();
    const b = await login();
    expect(b.json().user.id).toBe(a.json().user.id);
  });

  it.each([
    ["senha errada", { ...TEST_USER, password: "outra-senha-qualquer" }],
    ["usuário errado", { ...TEST_USER, username: "outro" }],
  ])("recusa %s com 401 e não cria conta", async (_name, payload) => {
    await start();
    const res = await login(payload);
    expect(res.statusCode).toBe(401);
    expect(res.json().token).toBeUndefined();
    expect(res.body).not.toContain(TEST_USER.password);
    expect((await login()).json().user.id).toBe(1);
  });

  it("recusa corpo sem usuário ou senha", async () => {
    await start();
    expect((await login({})).statusCode).toBe(400);
    expect((await login({ username: "revisor", password: "" })).statusCode).toBe(400);
  });

  it("fica desligado sem a conta de teste configurada", async () => {
    await start({ testUser: null });
    expect((await login()).statusCode).toBe(404);
  });

  it("não tem rota de cadastro", async () => {
    await start();
    for (const url of ["/api/auth/register", "/api/auth/signup"]) {
      const res = await app.inject({ method: "POST", url, payload: TEST_USER });
      expect(res.statusCode).toBe(404);
    }
  });

  it("limita a 10 tentativas por minuto, mesmo com a senha certa depois", async () => {
    await start();
    for (let i = 0; i < 10; i++) {
      expect((await login({ ...TEST_USER, password: `errada-${i}` })).statusCode).toBe(401);
    }
    expect((await login()).statusCode).toBe(429);
  });

  it("excluir a conta de teste não impede o próximo login, que começa vazio", async () => {
    await start();
    const first = (await login()).json();
    // Dados em todas as tabelas que referenciam o usuário.
    const folder = await post("/api/folders", first.token, { name: "Pasta" });
    await post("/api/notes", first.token, { folderId: folder.json().id, contentMd: "# Nota" });
    const board = await post("/api/task-folders", first.token, { name: "Quadro" });
    const list = await post("/api/task-lists", first.token, { folderId: board.json().id, name: "Lista" });
    expect((await post("/api/tasks", first.token, { listId: list.json().id, title: "Tarefa" })).statusCode).toBe(201);
    expect((await post("/api/inbox", first.token, { clientId: "c1", content: "ideia" })).statusCode).toBe(201);

    const del = await app.inject({ method: "DELETE", url: "/api/auth/account", headers: bearer(first.token) });
    expect(del.statusCode).toBe(200);
    const stale = await app.inject({ method: "GET", url: "/api/folders", headers: bearer(first.token) });
    expect(stale.statusCode).toBe(401);

    const again = await login();
    expect(again.statusCode).toBe(200);
    expect(again.json().user.id).not.toBe(first.user.id);
    const folders = await app.inject({ method: "GET", url: "/api/folders", headers: bearer(again.json().token) });
    expect(folders.json()).toEqual([]);
  });

  it("desligar o recurso invalida a sessão da conta de teste", async () => {
    await start();
    const { token } = (await login()).json();
    cfg.testUser = null;
    const folders = await app.inject({ method: "GET", url: "/api/folders", headers: bearer(token) });
    expect(folders.statusCode).toBe(401);
    const me = await app.inject({ method: "GET", url: "/api/auth/me", headers: bearer(token) });
    expect(me.json()).toEqual({ authenticated: false });
  });

  it("a conta de teste não adota dados legados nem atrapalha a adoção pelo primeiro login Google", async () => {
    await start();
    const sqlite = new (await import("better-sqlite3")).default(cfg.dbPath);
    sqlite
      .prepare("INSERT INTO notes (content_md, created_at, updated_at) VALUES ('# Legado', 1, 1)")
      .run();
    sqlite.close();

    const { token } = (await login()).json();
    const mine = await app.inject({ method: "GET", url: "/api/notes?view=active", headers: bearer(token) });
    expect(mine.json()).toEqual([]);

    const google = await loginWithGoogle(app);
    const adopted = await app.inject({
      method: "GET",
      url: "/api/notes?view=active",
      headers: { cookie: google.cookie },
    });
    expect(adopted.json()).toHaveLength(1);
  });
});
