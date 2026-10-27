import type { FastifyInstance } from "fastify";
import type { AppContext } from "../context.js";
import { OAuthCallbackQuery } from "../validation.js";
import { serviceUnavailable, unauthorized } from "../errors.js";
import {
  APP_STATE_PREFIX,
  getSessionUserId,
  signToken,
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

/** Deep link registrado pelos apps (mobile e desktop) para receber o JWT após o login Google. */
const APP_DEEP_LINK = "znotes://auth";

function toPublicUser(user: UserRow) {
  return { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, isAdmin: user.isAdmin === 1 };
}

export function registerAuthRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.get("/api/auth/google", async (req, reply) => {
    if (!isGoogleConfigured(ctx.cfg)) throw serviceUnavailable("Login com Google não configurado no servidor");
    const { client } = req.query as { client?: string };
    const state = newOAuthState(client === "app" ? "app" : undefined);
    setOAuthStateCookie(reply, state, ctx.cfg.isProd);
    reply.redirect(buildGoogleAuthUrl(ctx.cfg.google, state));
  });

  app.get(
    "/api/auth/google/callback",
    { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const { code, state, error } = OAuthCallbackQuery.parse(req.query);
      // Destino fixo: o único redirect externo possível é o deep link do app, nunca uma URL vinda do cliente.
      const isApp = state?.startsWith(APP_STATE_PREFIX) ?? false;
      if (error) {
        const reason = error === "access_denied" ? "denied" : "error";
        reply.redirect(isApp ? `${APP_DEEP_LINK}?error=${reason}` : `/?auth=${reason}`);
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
      if (isApp) {
        reply.redirect(`${APP_DEEP_LINK}?token=${encodeURIComponent(signToken(ctx, user.id))}`);
        return;
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
    const userId = getSessionUserId(req, ctx.cfg.sessionSecret);
    if (userId === null) return { authenticated: false as const };
    const user = getUserById(ctx, userId);
    if (!user) return { authenticated: false as const };
    return { authenticated: true as const, user: toPublicUser(user) };
  });
}

