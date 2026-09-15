import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { makeTestApp, loginWithGoogle, type TestApp } from "../test-helpers.js";

const ADMIN_PROFILE = { sub: "admin-sub", email: "Admin@Example.com", name: "Admin" };

describe("admin guard (backend, por rota)", () => {
  let t: TestApp;
  beforeEach(async () => {
    t = await makeTestApp();
  });
  afterEach(async () => {
    await t.cleanup();
  });

  it("sem sessão retorna 401 nas rotas admin", async () => {
    for (const [method, url] of [["GET", "/api/admin/metrics"], ["POST", "/api/admin/rebuild-mirror"], ["POST", "/api/admin/backup-now"]] as const) {
      const res = await t.app.inject({ method, url });
      expect(res.statusCode).toBe(401);
    }
  });

  it("usuário comum recebe 403 em todas as rotas admin", async () => {
    const authed = { headers: { cookie: t.cookie } };
    expect((await t.app.inject({ method: "GET", url: "/api/admin/metrics", ...authed })).statusCode).toBe(403);
    expect((await t.app.inject({ method: "POST", url: "/api/admin/rebuild-mirror", ...authed })).statusCode).toBe(
      403,
    );
    expect((await t.app.inject({ method: "POST", url: "/api/admin/backup-now", ...authed })).statusCode).toBe(403);
    const me = await t.app.inject({ method: "GET", url: "/api/auth/me", ...authed });
    expect(me.json().user.isAdmin).toBe(false);
  });

  it("e-mail da allowlist vira admin no login (case-insensitive)", async () => {
    const a = await makeTestApp(ADMIN_PROFILE, { adminEmails: ["admin@example.com"] });
    try {
      const me = await a.app.inject({ method: "GET", url: "/api/auth/me", headers: { cookie: a.cookie } });
      expect(me.json().user.isAdmin).toBe(true);
      const metrics = await a.app.inject({ method: "GET", url: "/api/admin/metrics", headers: { cookie: a.cookie } });
      expect(metrics.statusCode).toBe(200);
      expect(Object.keys(metrics.json().series)).toContain("users_total");
    } finally {
      await a.cleanup();
    }
  });

  it("promove conta existente quando o e-mail entra na allowlist (sem novo login)", async () => {
    t.cfg.adminEmails = ["user1@example.com"];
    const res = await t.app.inject({ method: "GET", url: "/api/admin/metrics", headers: { cookie: t.cookie } });
    expect(res.statusCode).toBe(200);
    const me = await t.app.inject({ method: "GET", url: "/api/auth/me", headers: { cookie: t.cookie } });
    expect(me.json().user.isAdmin).toBe(true);
  });

  it("remove admin quando o e-mail sai da allowlist (no próximo login)", async () => {
    const a = await makeTestApp(ADMIN_PROFILE, { adminEmails: ["admin@example.com"] });
    try {
      a.cfg.adminEmails = [];
      const again = await loginWithGoogle(a.app, ADMIN_PROFILE);
      const me = await a.app.inject({ method: "GET", url: "/api/auth/me", headers: { cookie: again.cookie } });
      expect(me.json().user.isAdmin).toBe(false);
      const metrics = await a.app.inject({
        method: "GET",
        url: "/api/admin/metrics",
        headers: { cookie: again.cookie },
      });
      expect(metrics.statusCode).toBe(403);
    } finally {
      await a.cleanup();
    }
  });
});
