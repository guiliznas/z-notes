import { describe, it, expect, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";
import { makeConfig, type AppConfig } from "../config.js";

describe("rate limit", () => {
  let app: FastifyInstance;
  let dataDir: string;

  async function start(overrides: Partial<AppConfig> = {}) {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "z-notes-rl-"));
    const cfg = makeConfig({ dataDir, ...overrides });
    cfg.google = { clientId: "id", clientSecret: "secret", callbackUrl: "http://test/callback" };
    app = await buildApp(cfg);
  }

  afterEach(async () => {
    await app.close();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  const startLogin = (ip?: string) =>
    app.inject({
      method: "GET",
      url: "/api/auth/google",
      headers: ip ? { "x-forwarded-for": ip } : {},
    });

  it("limita o início do login a 20 por minuto por IP", async () => {
    await start();
    for (let i = 0; i < 20; i++) expect((await startLogin()).statusCode).toBe(302);
    const blocked = await startLogin();
    expect(blocked.statusCode).toBe(429);
  });

  it("limita o callback a 20 por minuto por IP", async () => {
    await start();
    for (let i = 0; i < 20; i++) {
      const r = await app.inject({ method: "GET", url: "/api/auth/google/callback?error=access_denied" });
      expect(r.statusCode).toBe(302);
    }
    const blocked = await app.inject({ method: "GET", url: "/api/auth/google/callback?error=access_denied" });
    expect(blocked.statusCode).toBe(429);
  });

  it("atrás de proxy confiável, cada IP do X-Forwarded-For tem seu próprio limite", async () => {
    await start({ trustProxy: true });
    for (let i = 0; i < 20; i++) expect((await startLogin("203.0.113.1")).statusCode).toBe(302);
    expect((await startLogin("203.0.113.1")).statusCode).toBe(429);
    expect((await startLogin("203.0.113.2")).statusCode).toBe(302);
  });

  it("sem trustProxy, X-Forwarded-For forjado não burla o limite", async () => {
    await start({ trustProxy: false });
    for (let i = 0; i < 20; i++) expect((await startLogin(`198.51.100.${i}`)).statusCode).toBe(302);
    expect((await startLogin("198.51.100.99")).statusCode).toBe(429);
  });

  it("rotas protegidas também têm teto global por IP", async () => {
    await start();
    let last = 0;
    for (let i = 0; i < 601; i++) last = (await app.inject({ method: "GET", url: "/api/folders" })).statusCode;
    expect(last).toBe(429);
  });

  it("responde 429 em JSON com Retry-After", async () => {
    await start();
    for (let i = 0; i < 20; i++) await startLogin();
    const blocked = await startLogin();
    expect(blocked.headers["retry-after"]).toBeDefined();
    expect(blocked.json().error).toBe("too_many_requests");
  });
});
