import type { FastifyInstance } from "fastify";
import type { AppContext } from "../context.js";
import { rebuildMirror } from "../services/mirror-sync.js";

export function registerAdminRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.post("/api/admin/rebuild-mirror", async () => {
    rebuildMirror(ctx);
    return { ok: true };
  });
}
