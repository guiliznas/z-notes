import type { FastifyInstance } from "fastify";
import type { AppContext } from "../context.js";
import { OAuthCallbackQuery, PasswordLoginSchema } from "../validation.js";
import { notFound, serviceUnavailable, unauthorized } from "../errors.js";
import {
  APP_STATE_PREFIX,
  getSessionUserId,
  requireAuth,
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
import { adoptOrphanData, deleteUserAccount, getSessionUser, upsertUserByGoogle, type UserRow } from "../auth/users.js";
import { matchesTestCredentials, upsertTestUser } from "../auth/test-user.js";
import { rebuildMirror } from "../services/mirror-sync.js";

/** Início e fim do OAuth: bem abaixo do teto global, para frear força bruta/abuso do fluxo de login. */
const LOGIN_RATE_LIMIT = { max: 20, timeWindow: "1 minute" };

/** Login por senha: mais apertado, é o único ponto em que dá para tentar adivinhar uma credencial. */
const PASSWORD_RATE_LIMIT = { max: 10, timeWindow: "1 minute" };

/** Deep link registrado pelos apps (mobile e desktop) para receber o JWT após o login Google. */
const APP_DEEP_LINK = "znotes://auth";

function toPublicUser(user: UserRow) {
  return { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, isAdmin: user.isAdmin === 1 };
}

export function registerAuthRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.get("/api/auth/google", { config: { rateLimit: LOGIN_RATE_LIMIT } }, async (req, reply) => {
    if (!isGoogleConfigured(ctx.cfg)) throw serviceUnavailable("Login com Google não configurado no servidor");
    const { client } = req.query as { client?: string };
    const state = newOAuthState(client === "app" ? "app" : undefined);
    setOAuthStateCookie(reply, state, ctx.cfg.isProd);
    reply.redirect(buildGoogleAuthUrl(ctx.cfg.google, state));
  });

  app.get(
    "/api/auth/google/callback",
    { config: { rateLimit: LOGIN_RATE_LIMIT } },
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

  // Só a conta de teste definida no ambiente (revisão da Play Store). Não há cadastro.
  app.post("/api/auth/password", { config: { rateLimit: PASSWORD_RATE_LIMIT } }, async (req) => {
    const testUser = ctx.cfg.testUser;
    if (!testUser) throw notFound("Login com usuário e senha não está disponível neste servidor");
    const { username, password } = PasswordLoginSchema.parse(req.body);
    if (!matchesTestCredentials(testUser, username, password)) throw unauthorized("Usuário ou senha inválidos");
    const user = upsertTestUser(ctx, testUser.username);
    return { token: signToken(ctx, user.id), user: toPublicUser(user) };
  });

  app.post("/api/auth/logout", async (_req, reply) => {
    clearSessionCookie(reply);
    return { ok: true };
  });

  app.get("/api/auth/me", async (req) => {
    const userId = getSessionUserId(req, ctx.cfg.sessionSecret);
    if (userId === null) return { authenticated: false as const };
    const user = getSessionUser(ctx, userId);
    if (!user) return { authenticated: false as const };
    return { authenticated: true as const, user: toPublicUser(user) };
  });

  app.delete("/api/auth/account", async (req, reply) => {
    const userId = requireAuth(req, ctx);
    deleteUserAccount(ctx, userId);
    clearSessionCookie(reply);
    return { deleted: true as const };
  });
}

