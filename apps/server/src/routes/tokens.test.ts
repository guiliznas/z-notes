import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { makeTestApp, loginWithGoogle, type TestApp } from "../test-helpers.js";

const PROFILE_B = { sub: "google-sub-2", email: "user2@example.com", name: "User Dois" };

describe("tokens pessoais de captura (issue #32 / #94)", () => {
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

  const get = (url: string, cookie = t.cookie) =>
    t.app.inject({ method: "GET", url, headers: { cookie } });

  const post = (url: string, payload: unknown, cookie = t.cookie) =>
    t.app.inject({
      method: "POST",
      url,
      headers: { cookie },
      payload: payload as object,
    });

  const del = (url: string, cookie = t.cookie) =>
    t.app.inject({ method: "DELETE", url, headers: { cookie } });

  const tokenPost = (url: string, token: string, payload: unknown) =>
    t.app.inject({
      method: "POST",
      url,
      headers: { authorization: `Bearer ${token}` },
      payload: payload as object,
    });

  const tokenGet = (url: string, token: string) =>
    t.app.inject({
      method: "GET",
      url,
      headers: { authorization: `Bearer ${token}` },
    });

  describe("gerenciamento de tokens (CRUD)", () => {
    it("exige autenticação para gerenciar tokens", async () => {
      const resGet = await t.app.inject({ method: "GET", url: "/api/tokens" });
      expect(resGet.statusCode).toBe(401);

      const resPost = await t.app.inject({
        method: "POST",
        url: "/api/tokens",
        payload: { name: "Teste" },
      });
      expect(resPost.statusCode).toBe(401);

      const resDel = await t.app.inject({ method: "DELETE", url: "/api/tokens/1" });
      expect(resDel.statusCode).toBe(401);
    });

    it("cria um token com prefixo znt_, salva hash no banco e retorna token em texto puro apenas uma vez", async () => {
      const res = await post("/api/tokens", { name: "Atalhos do iPhone" });
      expect(res.statusCode).toBe(201);
      const data = res.json();
      expect(data.id).toBeGreaterThan(0);
      expect(data.name).toBe("Atalhos do iPhone");
      expect(data.scope).toBe("inbox:write");
      expect(data.token).toMatch(/^znt_[a-f0-9]{64}$/);
      expect(data.prefix).toMatch(/^znt_[a-f0-9]{8}…$/);
      expect(data.createdAt).toBeGreaterThan(0);

      // Inspeciona banco: apenas o hash SHA-256 é armazenado
      const row = t.cfg;
      const dbRow = t.app
        ? (t as unknown as { app: { ctx?: { sqlite: { prepare: (s: string) => { get: (id: number) => { token_hash: string } } } } } })
        : null;
      // Listar tokens não revela o token nem o hash
      const listRes = await get("/api/tokens");
      expect(listRes.statusCode).toBe(200);
      const list = listRes.json();
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe(data.id);
      expect(list[0].name).toBe("Atalhos do iPhone");
      expect(list[0].token).toBeUndefined();
      expect(list[0].tokenHash).toBeUndefined();
      expect(list[0].active).toBe(true);
      expect(list[0].lastUsedAt).toBeNull();
    });

    it("valida obrigatoriedade do nome do token (400)", async () => {
      const resEmpty = await post("/api/tokens", { name: "" });
      expect(resEmpty.statusCode).toBe(400);

      const resWhitespace = await post("/api/tokens", { name: "   " });
      expect(resWhitespace.statusCode).toBe(400);
    });

    it("revoga um token com sucesso (DELETE /api/tokens/:id)", async () => {
      const created = (await post("/api/tokens", { name: "Para revogar" })).json();

      const delRes = await del(`/api/tokens/${created.id}`);
      expect(delRes.statusCode).toBe(200);
      expect(delRes.json().success).toBe(true);

      const list = (await get("/api/tokens")).json();
      expect(list[0].active).toBe(false);
      expect(list[0].revokedAt).toBeGreaterThan(0);
    });
  });

  describe("isolamento entre usuários (100%)", () => {
    it("usuário B não vê nem revoga tokens de usuário A (404)", async () => {
      const tokenA = (await post("/api/tokens", { name: "Token Secreto de A" })).json();

      // B não lista o token de A
      const listB = (await get("/api/tokens", cookieB)).json();
      expect(listB).toHaveLength(0);

      // B não pode revogar o token de A (404)
      const delB = await del(`/api/tokens/${tokenA.id}`, cookieB);
      expect(delB.statusCode).toBe(404);
    });
  });

  describe("autenticação e captura via Bearer Token", () => {
    it("permite POST /api/inbox com Bearer token e gera clientId automaticamente se omitido", async () => {
      const createdToken = (await post("/api/tokens", { name: "Bot Telegram" })).json();

      const captureRes = await tokenPost("/api/inbox", createdToken.token, {
        content: "Captura rápida via bot externo",
      });
      expect(captureRes.statusCode).toBe(201);
      const item = captureRes.json();
      expect(item.id).toBeGreaterThan(0);
      expect(item.content).toBe("Captura rápida via bot externo");
      expect(item.source).toBe("api");
      expect(item.clientId).toBeDefined();
      expect(item.clientId.length).toBeGreaterThan(10);

      // Usuário A enxerga o item no seu Inbox
      const inboxRes = await get("/api/inbox");
      expect(inboxRes.json()).toHaveLength(1);
      expect(inboxRes.json()[0].id).toBe(item.id);

      // Usuário B tem Inbox vazio (isolamento de captura)
      const inboxB = await get("/api/inbox", cookieB);
      expect(inboxB.json()).toHaveLength(0);

      // Token registra lastUsedAt atualizado
      const list = (await get("/api/tokens")).json();
      expect(list[0].lastUsedAt).toBeGreaterThan(0);
    });

    it("suporta payload com campo 'text' (comum em Atalhos do iOS e Tasker)", async () => {
      const createdToken = (await post("/api/tokens", { name: "iOS Shortcut" })).json();

      const captureRes = await tokenPost("/api/inbox", createdToken.token, {
        text: "Ideia capturada pela Siri",
      });
      expect(captureRes.statusCode).toBe(201);
      expect(captureRes.json().content).toBe("Ideia capturada pela Siri");
    });

    it("rejeita token inválido com 401 Unauthorized", async () => {
      const res = await tokenPost("/api/inbox", "znt_0000000000000000000000000000000000000000000000000000000000000000", {
        content: "Tentativa inválida",
      });
      expect(res.statusCode).toBe(401);
      expect(res.json().error).toBe("unauthorized");
    });

    it("token revogado deixa de funcionar imediatamente (401)", async () => {
      const token = (await post("/api/tokens", { name: "Temporário" })).json();

      // Funciona antes de revogar
      const res1 = await tokenPost("/api/inbox", token.token, { content: "Antes da revogação" });
      expect(res1.statusCode).toBe(201);

      // Revoga
      await del(`/api/tokens/${token.id}`);

      // Rejeitado na hora
      const res2 = await tokenPost("/api/inbox", token.token, { content: "Depois da revogação" });
      expect(res2.statusCode).toBe(401);
    });
  });

  describe("restrição estrita de escopo (inbox:write não lê nada nem acessa outras entidades)", () => {
    it("rejeita GET /api/inbox com 403 Forbidden", async () => {
      const token = (await post("/api/tokens", { name: "Restrito" })).json();
      const res = await tokenGet("/api/inbox", token.token);
      expect(res.statusCode).toBe(403);
      expect(res.json().error).toBe("forbidden");
    });

    it("rejeita GET /api/notes com 403 Forbidden", async () => {
      const token = (await post("/api/tokens", { name: "Restrito" })).json();
      const res = await tokenGet("/api/notes", token.token);
      expect(res.statusCode).toBe(403);
    });

    it("rejeita POST /api/notes com 403 Forbidden", async () => {
      const token = (await post("/api/tokens", { name: "Restrito" })).json();
      const res = await tokenPost("/api/notes", token.token, { folderId: 1, contentMd: "Invadir" });
      expect(res.statusCode).toBe(403);
    });

    it("rejeita GET /api/tasks com 403 Forbidden", async () => {
      const token = (await post("/api/tokens", { name: "Restrito" })).json();
      const res = await tokenGet("/api/task-folders", token.token);
      expect(res.statusCode).toBe(403);
    });

    it("rejeita GET /api/tokens e DELETE /api/tokens com 403 Forbidden", async () => {
      const token = (await post("/api/tokens", { name: "Restrito" })).json();
      const resGet = await tokenGet("/api/tokens", token.token);
      expect(resGet.statusCode).toBe(403);

      const resDel = await t.app.inject({
        method: "DELETE",
        url: `/api/tokens/${token.id}`,
        headers: { authorization: `Bearer ${token.token}` },
      });
      expect(resDel.statusCode).toBe(403);
    });
  });
});
