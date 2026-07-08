import type { FastifyInstance } from "fastify";
import type { AppContext } from "../context.js";
import { LoginSchema } from "../validation.js";
import { unauthorized } from "../errors.js";
import { verifyPassword, setSessionCookie, clearSessionCookie, isAuthenticated, signToken } from "../auth/session.js";

export function registerAuthRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.post("/api/auth/login", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (req, reply) => {
    const body = LoginSchema.parse(req.body);
    if (!verifyPassword(ctx, body.password)) throw unauthorized("Senha incorreta");
    setSessionCookie(reply, ctx.cfg.isProd);
    const result: Record<string, unknown> = { ok: true };
    if (req.query && typeof req.query === "object" && "token" in (req.query as Record<string, string>)) {
      result.token = signToken(ctx);
    }
    return result;
  });

  app.post("/api/auth/logout", async (_req, reply) => {
    clearSessionCookie(reply);
    return { ok: true };
  });

  app.get("/api/auth/me", async (req) => ({ authenticated: isAuthenticated(req) }));
}