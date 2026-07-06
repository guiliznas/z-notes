import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { buildApp } from "./app.js";
import { makeConfig, type AppConfig } from "./config.js";
import { openDatabase } from "./db/bootstrap.js";
import type { AppContext } from "./context.js";

export interface TestApp {
  app: FastifyInstance;
  cfg: AppConfig;
  cookie: string;
  cleanup: () => Promise<void>;
}

export async function makeTestApp(): Promise<TestApp> {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "z-notes-test-"));
  const cfg = makeConfig({ dataDir });
  const app = await buildApp(cfg);
  const cookie = await login(app);
  const cleanup = async () => {
    await app.close();
    fs.rmSync(dataDir, { recursive: true, force: true });
  };
  return { app, cfg, cookie, cleanup };
}

export interface TestCtx {
  ctx: AppContext;
  cfg: AppConfig;
  cleanup: () => void;
}

/** Contexto de serviço isolado (db + espelho em dir temporário), sem HTTP. */
export function makeTestCtx(): TestCtx {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "z-notes-ctx-"));
  const cfg = makeConfig({ dataDir });
  const { sqlite, db } = openDatabase(cfg.dbPath);
  const ctx: AppContext = { db, sqlite, cfg };
  const cleanup = () => {
    sqlite.close();
    fs.rmSync(dataDir, { recursive: true, force: true });
  };
  return { ctx, cfg, cleanup };
}

async function login(app: FastifyInstance): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { password: "changeme" },
  });
  const cookie = res.cookies.find((c) => c.name === "z_session");
  if (!cookie) throw new Error("login não retornou cookie de sessão");
  return `${cookie.name}=${cookie.value}`;
}

/** Lê o conteúdo de um arquivo relativo ao espelho .md (ou null se não existe). */
export function readMirror(cfg: AppConfig, relPath: string): string | null {
  const abs = path.join(cfg.mirrorDir, relPath);
  return fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : null;
}

/** Lista recursiva de arquivos no espelho (caminhos relativos). */
export function listMirror(cfg: AppConfig): string[] {
  const out: string[] = [];
  const walk = (dir: string, base: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = base ? `${base}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(path.join(dir, entry.name), rel);
      else out.push(rel);
    }
  };
  walk(cfg.mirrorDir, "");
  return out.sort();
}
