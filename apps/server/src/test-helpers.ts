import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "./app.js";
import { makeConfig, type AppConfig } from "./config.js";
import { openDatabase } from "./db/bootstrap.js";
import type { AppContext, RequestContext } from "./context.js";
import { upsertUserByGoogle, type GoogleProfile } from "./auth/users.js";

export interface TestApp {
  app: FastifyInstance;
  cfg: AppConfig;
  cookie: string;
  userId: number;
  cleanup: () => Promise<void>;
}

export interface FakeGoogleProfile {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

const DEFAULT_PROFILE: FakeGoogleProfile = {
  sub: "google-sub-1",
  email: "user1@example.com",
  name: "User Um",
};

export async function makeTestApp(profile: FakeGoogleProfile = DEFAULT_PROFILE): Promise<TestApp> {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "z-notes-test-"));
  const cfg = makeConfig({ dataDir });
  // OAuth "configurado" nos testes; o fluxo real é exercido com fetch mockado.
  cfg.google = { clientId: "test-client", clientSecret: "test-secret", callbackUrl: "http://test/callback" };
  const app = await buildApp(cfg);
  const { cookie, userId } = await loginWithGoogle(app, profile);
  const cleanup = async () => {
    await app.close();
    fs.rmSync(dataDir, { recursive: true, force: true });
  };
  return { app, cfg, cookie, userId, cleanup };
}

export interface TestCtx {
  ctx: RequestContext;
  cfg: AppConfig;
  userId: number;
  cleanup: () => void;
}

/** Contexto de serviço isolado (db + espelho em dir temporário), sem HTTP, com usuário semeado. */
export function makeTestCtx(): TestCtx {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "z-notes-ctx-"));
  const cfg = makeConfig({ dataDir });
  const { sqlite, db } = openDatabase(cfg.dbPath);
  const base: AppContext = { db, sqlite, cfg };
  const user = upsertUserByGoogle(base, { sub: "test-sub", email: "test@example.com" });
  const ctx: RequestContext = { ...base, userId: user.id };
  const cleanup = () => {
    sqlite.close();
    fs.rmSync(dataDir, { recursive: true, force: true });
  };
  return { ctx, cfg, userId: user.id, cleanup };
}

function mockGoogleFetch(profile: FakeGoogleProfile) {
  return async (url: unknown) => {
    const u = String(url);
    if (u.includes("oauth2.googleapis.com/token")) {
      return new Response(
        JSON.stringify({ access_token: "fake-access-token", token_type: "Bearer", expires_in: 3600 }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    if (u.includes("userinfo")) {
      const body: GoogleProfile = { sub: profile.sub, email: profile.email, name: profile.name, picture: profile.picture };
      return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    throw new Error(`fetch inesperado em teste: ${u}`);
  };
}

/** Inicia o OAuth: retorna o state e o header Cookie com o state assinado. */
export async function startOAuth(app: FastifyInstance): Promise<{ state: string; cookie: string }> {
  const start = await app.inject({ method: "GET", url: "/api/auth/google" });
  if (start.statusCode !== 302) throw new Error(`GET /google retornou ${start.statusCode}`);
  const stateCookie = start.cookies.find((c) => c.name === "z_oauth_state");
  if (!stateCookie) throw new Error("GET /google não retornou cookie de state");
  return { state: stateCookie.value.split(".")[0], cookie: `z_oauth_state=${stateCookie.value}` };
}

export function finishOAuth(app: FastifyInstance, state: string, stateCookie: string) {
  return app.inject({
    method: "GET",
    url: `/api/auth/google/callback?code=fake-code&state=${state}`,
    headers: { cookie: stateCookie },
  });
}

/**
 * Executa o fluxo OAuth real (redirect + callback) com o Google mockado.
 * Retorna o cookie de sessão assinado e o id do usuário criado.
 */
export async function loginWithGoogle(
  app: FastifyInstance,
  profile: FakeGoogleProfile = DEFAULT_PROFILE,
): Promise<{ cookie: string; userId: number }> {
  const { state, cookie: stateCookie } = await startOAuth(app);
  vi.stubGlobal("fetch", mockGoogleFetch(profile));
  try {
    const cb = await finishOAuth(app, state, stateCookie);
    if (cb.statusCode !== 302) throw new Error(`callback retornou ${cb.statusCode}: ${cb.body}`);
    const session = cb.cookies.find((c) => c.name === "z_session");
    if (!session) throw new Error("callback não retornou cookie de sessão");
    return { cookie: `${session.name}=${session.value}`, userId: Number(session.value.split(".")[0]) };
  } finally {
    vi.unstubAllGlobals();
  }
}

/** Base do espelho a inspecionar: raiz global ou subdir do usuário. */
function mirrorBase(cfg: AppConfig, userId?: number): string {
  return userId === undefined ? cfg.mirrorDir : path.join(cfg.mirrorDir, String(userId));
}

/** Lê o conteúdo de um arquivo relativo ao espelho .md (ou null se não existe). */
export function readMirror(cfg: AppConfig, relPath: string, userId?: number): string | null {
  const abs = path.join(mirrorBase(cfg, userId), relPath);
  return fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : null;
}

/** Lista recursiva de arquivos no espelho (caminhos relativos). */
export function listMirror(cfg: AppConfig, userId?: number): string[] {
  const out: string[] = [];
  const walk = (dir: string, base: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = base ? `${base}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(path.join(dir, entry.name), rel);
      else out.push(rel);
    }
  };
  walk(mirrorBase(cfg, userId), "");
  return out.sort();
}
