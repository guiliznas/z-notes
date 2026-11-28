import type { FastifyInstance } from "fastify";
import type { AppContext } from "../context.js";
import { requireAdmin, requireAuth } from "../auth/session.js";
import { forbidden, unauthorized } from "../errors.js";
import { validateApiToken } from "../services/tokens.js";
import { registerAuthRoutes } from "./auth.js";
import { registerFolderRoutes } from "./folders.js";
import { registerNoteRoutes } from "./notes.js";
import { registerTaskRoutes } from "./tasks.js";
import { registerInboxRoutes } from "./inbox.js";
import { registerSearchRoutes } from "./search.js";
import { registerIoRoutes } from "./io.js";
import { registerAdminRoutes } from "./admin.js";
import { registerTokenRoutes } from "./tokens.js";

const PUBLIC_PATHS = ["/api/health"];

export function registerApiRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.decorateRequest("userId", null);
  app.addHook("preHandler", async (req) => {
    const path = req.url.split("?")[0];
    if (!path.startsWith("/api/")) return;
    if (path.startsWith("/api/auth/") || PUBLIC_PATHS.includes(path)) return;

    // Tokens pessoais de API (prefixo znt_): escopo restrito a captura externa no Inbox
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer znt_")) {
      const token = authHeader.slice(7).trim();
      const validated = validateApiToken(ctx, token);
      if (!validated) {
        throw unauthorized("Token inválido ou revogado");
      }
      if (req.method === "POST" && path === "/api/inbox") {
        const scopes = validated.scope.split(",").map((s) => s.trim());
        if (!scopes.includes("inbox:write")) {
          throw forbidden("Token não possui escopo inbox:write");
        }
        req.userId = validated.userId;
        return;
      }
      throw forbidden("Token com escopo inbox:write possui permissão apenas para POST /api/inbox");
    }

    // Rotas admin: validação de papel no backend, em cada requisição (não contornável pelo front).
    req.userId = path.startsWith("/api/admin/") ? requireAdmin(req, ctx) : requireAuth(req, ctx);
  });

  app.get("/api/health", async () => ({ ok: true }));
  registerAuthRoutes(app, ctx);
  registerFolderRoutes(app, ctx);
  registerNoteRoutes(app, ctx);
  registerTaskRoutes(app, ctx);
  registerInboxRoutes(app, ctx);
  registerTokenRoutes(app, ctx);
  registerSearchRoutes(app, ctx);
  registerIoRoutes(app, ctx);
  registerAdminRoutes(app, ctx);
}