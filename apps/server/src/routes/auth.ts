import type { FastifyInstance } from "fastify";
import type { AppContext } from "../context.js";
import { OAuthCallbackQuery } from "../validation.js";
import { serviceUnavailable, unauthorized } from "../errors.js";
import {
  getSessionUserId,
  setSessionCookie,
  clearSessionCookie,
  newOAuthState,
  setOAuthStateCookie,
  consumeOAuthState,
} from "../auth/session.js";
import {
  buildGoogleAuthUrl,
  exchangeCodeForTokens,
  fetchGoogleProfile,
  isGoogleConfigured,
} from "../auth/google.js";
import { adoptOrphanData, getUserById, upsertUserByGoogle, type UserRow } from "../auth/users.js";
import { rebuildMirror } from "../services/mirror-sync.js";

function toPublicUser(user: UserRow) {
  return { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, isAdmin: user.isAdmin === 1 };
}

export function registerAuthRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.get("/api/auth/google", async (_req, reply) => {
    if (!isGoogleConfigured(ctx.cfg)) throw serviceUnavailable("Login com Google não configurado no servidor");
    const state = newOAuthState();
    setOAuthStateCookie(reply, state, ctx.cfg.isProd);
    reply.redirect(buildGoogleAuthUrl(ctx.cfg.google, state));
  });

  app.get(
    "/api/auth/google/callback",
    { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const { code, state, error } = OAuthCallbackQuery.parse(req.query);
      if (error) {
        reply.redirect(`/?auth=${error === "access_denied" ? "denied" : "error"}`);
        return;
      }
      if (!isGoogleConfigured(ctx.cfg)) throw serviceUnavailable("Login com Google não configurado no servidor");
      if (!code || !state || !consumeOAuthState(req, reply, state)) {
        throw unauthorized("Sessão de login inválida ou expirada");
      }
      const accessToken = await exchangeCodeForTokens(ctx.cfg.google, code);
      const profile = await fetchGoogleProfile(accessToken);
      const user = upsertUserByGoogle(ctx, profile);
      const adopted = adoptOrphanData(ctx, user.id);
      if (adopted.notes > 0 || adopted.folders > 0) {
        rebuildMirror({ ...ctx, userId: user.id });
      }
      setSessionCookie(reply, user.id, ctx.cfg.isProd);
      reply.redirect("/");
    },
  );

  app.post("/api/auth/logout", async (_req, reply) => {
    clearSessionCookie(reply);
    return { ok: true };
  });

  app.get("/api/auth/me", async (req) => {
    const userId = getSessionUserId(req);
    if (userId === null) return { authenticated: false as const };
    const user = getUserById(ctx, userId);
    if (!user) return { authenticated: false as const };
    return { authenticated: true as const, user: toPublicUser(user) };
  });
}
