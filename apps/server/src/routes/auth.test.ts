import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { makeTestApp, type TestApp } from "../test-helpers.js";

describe("auth", () => {
  let t: TestApp;
  beforeEach(async () => {
    t = await makeTestApp();
  });
  afterEach(async () => {
    await t.cleanup();
  });

  it("bloqueia rotas protegidas sem sessão", async () => {
    const res = await t.app.inject({ method: "GET", url: "/api/folders" });
    expect(res.statusCode).toBe(401);
  });

  it("libera com senha correta", async () => {
    const res = await t.app.inject({ method: "GET", url: "/api/folders", headers: { cookie: t.cookie } });
    expect(res.statusCode).toBe(200);
  });

  it("rejeita senha incorreta", async () => {
    const res = await t.app.inject({ method: "POST", url: "/api/auth/login", payload: { password: "errada" } });
    expect(res.statusCode).toBe(401);
  });

  it("health é público", async () => {
    const res = await t.app.inject({ method: "GET", url: "/api/health" });
    expect(res.statusCode).toBe(200);
  });
});
