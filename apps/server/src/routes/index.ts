import type { FastifyInstance } from "fastify";
import type { AppContext } from "../context.js";
import { requireAdmin, requireAuth } from "../auth/session.js";
import { registerAuthRoutes } from "./auth.js";
import { registerFolderRoutes } from "./folders.js";
import { registerNoteRoutes } from "./notes.js";
import { registerSearchRoutes } from "./search.js";
import { registerIoRoutes } from "./io.js";
import { registerAdminRoutes } from "./admin.js";

const PUBLIC_PATHS = ["/api/health"];

export function registerApiRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.decorateRequest("userId", null);
  app.addHook("preHandler", async (req) => {
    const path = req.url.split("?")[0];
    if (!path.startsWith("/api/")) return;
    if (path.startsWith("/api/auth/") || PUBLIC_PATHS.includes(path)) return;
    // Rotas admin: validação de papel no backend, em cada requisição (não contornável pelo front).
    req.userId = path.startsWith("/api/admin/") ? requireAdmin(req, ctx) : requireAuth(req, ctx);
  });

  app.get("/api/health", async () => ({ ok: true }));
  registerAuthRoutes(app, ctx);
  registerFolderRoutes(app, ctx);
  registerNoteRoutes(app, ctx);
  registerSearchRoutes(app, ctx);
  registerIoRoutes(app, ctx);
  registerAdminRoutes(app, ctx);
}