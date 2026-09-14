import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { buildApp } from "../app.js";
import { makeConfig } from "../config.js";
import { makeTestApp, loginWithGoogle, startOAuth, finishOAuth, type TestApp } from "../test-helpers.js";
import { signSessionValue } from "../auth/session.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function stubFetch(impl: (url: unknown) => Promise<Response>) {
  vi.stubGlobal("fetch", impl);
}

const okToken = () =>
  new Response(JSON.stringify({ access_token: "fake-access-token" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

describe("auth", () => {
  let t: TestApp;
  beforeEach(async () => {
    t = await makeTestApp();
  });
  afterEach(async () => {
    vi.unstubAllGlobals();
    await t.cleanup();
  });

  it("bloqueia rotas protegidas sem sessão", async () => {
    const res = await t.app.inject({ method: "GET", url: "/api/folders" });
    expect(res.statusCode).toBe(401);
  });

  it("libera rotas protegidas com sessão Google", async () => {
    const res = await t.app.inject({ method: "GET", url: "/api/folders", headers: { cookie: t.cookie } });
    expect(res.statusCode).toBe(200);
  });

  it("rejeita cookie de sessão adulterado", async () => {
    const res = await t.app.inject({ method: "GET", url: "/api/folders", headers: { cookie: "z_session=1.assinatura-falsa" } });
    expect(res.statusCode).toBe(401);
  });

  it("GET /google redireciona para o Google com state", async () => {
    const res = await t.app.inject({ method: "GET", url: "/api/auth/google" });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain("https://accounts.google.com/o/oauth2/v2/auth");
    expect(res.headers.location).toContain("state=");
    expect(res.cookies.some((c) => c.name === "z_oauth_state")).toBe(true);
  });

  it("GET /google sem configuração retorna 503", async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "z-notes-nocfg-"));
    const cfg = makeConfig({ dataDir });
    const app = await buildApp(cfg);
    try {
      const res = await app.inject({ method: "GET", url: "/api/auth/google" });
      expect(res.statusCode).toBe(503);
    } finally {
      await app.close();
      fs.rmSync(dataDir, { recursive: true, force: true });
    }
  });

  it("callback com state inválido retorna 401 sem criar sessão", async () => {
    const res = await t.app.inject({
      method: "GET",
      url: "/api/auth/google/callback?code=x&state=invalido",
      headers: { cookie: "z_oauth_state=abc.def" },
    });
    expect(res.statusCode).toBe(401);
    expect(res.cookies.some((c) => c.name === "z_session")).toBe(false);
  });

  it("callback com erro do Google redireciona para /?auth=denied", async () => {
    const res = await t.app.inject({ method: "GET", url: "/api/auth/google/callback?error=access_denied" });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/?auth=denied");
  });

  it("me retorna o usuário logado", async () => {
    const res = await t.app.inject({ method: "GET", url: "/api/auth/me", headers: { cookie: t.cookie } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.authenticated).toBe(true);
    expect(body.user.email).toBe("user1@example.com");
  });

  it("me sem sessão retorna authenticated:false", async () => {
    const res = await t.app.inject({ method: "GET", url: "/api/auth/me" });
    expect(res.json()).toEqual({ authenticated: false });
  });

  it("segundo login com o mesmo sub reutiliza o usuário", async () => {
    const again = await loginWithGoogle(t.app, { sub: "google-sub-1", email: "novo-email@example.com" });
    expect(again.userId).toBe(t.userId);
    const res = await t.app.inject({ method: "GET", url: "/api/auth/me", headers: { cookie: again.cookie } });
    expect(res.json().user.email).toBe("novo-email@example.com");
  });

  it("logout limpa a sessão", async () => {
    const res = await t.app.inject({ method: "POST", url: "/api/auth/logout", headers: { cookie: t.cookie } });
    expect(res.statusCode).toBe(200);
    const cleared = res.cookies.find((c) => c.name === "z_session");
    expect(cleared?.value).toBe("");
  });

  it("health é público", async () => {
    const res = await t.app.inject({ method: "GET", url: "/api/health" });
    expect(res.statusCode).toBe(200);
  });

  it("não vaza fetch mockado para fora dos testes", () => {
    expect(vi.isMockFunction(fetch)).toBe(false);
  });

  it("cookie de sessão é HttpOnly", async () => {
    const { state, cookie: stateCookie } = await startOAuth(t.app);
    stubFetch(async (url) => {
      const u = String(url);
      if (u.includes("oauth2.googleapis.com/token")) return okToken();
      return new Response(JSON.stringify({ sub: "flag-sub", email: "flag@example.com" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    try {
      const first = await finishOAuth(t.app, state, stateCookie);
      expect(first.statusCode).toBe(302);
      expect(first.cookies.find((c) => c.name === "z_session")?.httpOnly).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("replay do callback não cria nova sessão (code de uso único no Google)", async () => {
    const { state, cookie: stateCookie } = await startOAuth(t.app);
    let tokenCalls = 0;
    stubFetch(async (url) => {
      const u = String(url);
      // Google real só aceita cada code uma vez: segunda troca falha.
      if (u.includes("oauth2.googleapis.com/token")) {
        tokenCalls++;
        return tokenCalls === 1 ? okToken() : new Response("invalid_grant", { status: 400 });
      }
      return new Response(JSON.stringify({ sub: "replay-sub", email: "replay@example.com" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    try {
      const first = await finishOAuth(t.app, state, stateCookie);
      expect(first.statusCode).toBe(302);

      const replay = await finishOAuth(t.app, state, stateCookie);
      expect(replay.statusCode).toBe(502);
      expect(replay.cookies.some((c) => c.name === "z_session")).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("Google rejeitando o code retorna 502 sem sessão", async () => {
    const { state, cookie: stateCookie } = await startOAuth(t.app);
    stubFetch(async () => new Response("invalid_grant", { status: 400 }));
    try {
      const res = await finishOAuth(t.app, state, stateCookie);
      expect(res.statusCode).toBe(502);
      expect(res.cookies.some((c) => c.name === "z_session")).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("userinfo sem e-mail retorna 502 sem criar usuário", async () => {
    const { state, cookie: stateCookie } = await startOAuth(t.app);
    stubFetch(async (url) => {
      if (String(url).includes("oauth2.googleapis.com/token")) return okToken();
      return new Response(JSON.stringify({ sub: "sem-email" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    try {
      const res = await finishOAuth(t.app, state, stateCookie);
      expect(res.statusCode).toBe(502);
      const me = await t.app.inject({ method: "GET", url: "/api/auth/me" });
      expect(me.json()).toEqual({ authenticated: false });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("sessão assinada de usuário inexistente é rejeitada", async () => {
    const forged = `z_session=${signSessionValue(t.cfg.sessionSecret, 9999)}`;
    const res = await t.app.inject({ method: "GET", url: "/api/folders", headers: { cookie: forged } });
    expect(res.statusCode).toBe(401);
    const me = await t.app.inject({ method: "GET", url: "/api/auth/me", headers: { cookie: forged } });
    expect(me.json()).toEqual({ authenticated: false });
  });
});
