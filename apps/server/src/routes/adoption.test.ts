import { describe, it, expect, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildApp } from "../app.js";
import { makeConfig } from "../config.js";
import { openDatabase } from "../db/bootstrap.js";
import { folders, notes } from "../db/schema.js";
import { loginWithGoogle, listMirror, type FakeGoogleProfile } from "../test-helpers.js";
import type { FastifyInstance } from "fastify";

const PROFILE_A: FakeGoogleProfile = { sub: "owner-sub", email: "owner@example.com", name: "Dono" };
const PROFILE_B: FakeGoogleProfile = { sub: "other-sub", email: "other@example.com" };

/**
 * Cenário real da migração: banco legado (sem dono) + primeiro login via OAuth.
 * As notas antigas têm que aparecer para o dono, com espelho regenerado —
 * e o segundo usuário não pode ver nada.
 */
describe("adoção via login (banco legado)", () => {
  const apps: FastifyInstance[] = [];
  const dirs: string[] = [];
  afterEach(async () => {
    for (const app of apps) await app.close();
    apps.length = 0;
    for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
    dirs.length = 0;
  });

  async function legacyApp() {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "z-notes-adopt-"));
    dirs.push(dataDir);
    const cfg = makeConfig({ dataDir });
    cfg.google = { clientId: "test-client", clientSecret: "test-secret", callbackUrl: "http://test/callback" };
    const app = await buildApp(cfg);
    apps.push(app);

    // Linhas legadas: user_id NULL (era single-tenant).
    const legacy = openDatabase(cfg.dbPath);
    try {
      const now = Date.now();
      const folder = legacy.db
        .insert(folders)
        .values({ name: "Antigas", parentId: null, position: 0, createdAt: now, updatedAt: now })
        .returning()
        .get();
      legacy.db
        .insert(notes)
        .values({ folderId: folder.id, contentMd: "# Receita de bolo\nconteúdo", version: 1, createdAt: now, updatedAt: now })
        .run();
    } finally {
      legacy.sqlite.close();
    }
    return { app, cfg };
  }

  it("primeiro login adota as notas antigas e regenera o espelho", async () => {
    const { app, cfg } = await legacyApp();
    const { cookie, userId } = await loginWithGoogle(app, PROFILE_A);

    const list = await app.inject({ method: "GET", url: "/api/notes?view=active", headers: { cookie } });
    expect(list.statusCode).toBe(200);
    expect(list.json()).toHaveLength(1);
    expect(list.json()[0].title).toBe("Receita de bolo");

    const tree = await app.inject({ method: "GET", url: "/api/folders", headers: { cookie } });
    expect(tree.json()).toHaveLength(1);

    const files = listMirror(cfg, userId);
    expect(files).toContain("Antigas/receita-de-bolo.md");
  });

  it("segundo login não herda nada das notas adotadas", async () => {
    const { app } = await legacyApp();
    await loginWithGoogle(app, PROFILE_A);
    const b = await loginWithGoogle(app, PROFILE_B);

    const list = await app.inject({ method: "GET", url: "/api/notes?view=active", headers: { cookie: b.cookie } });
    expect(list.json()).toEqual([]);
    const search = await app.inject({ method: "GET", url: "/api/search?q=bolo", headers: { cookie: b.cookie } });
    expect(search.json()).toEqual([]);
  });
});
