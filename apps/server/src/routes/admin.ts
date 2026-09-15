import type { FastifyInstance } from "fastify";
import type { AppContext } from "../context.js";
import { reqCtx } from "../auth/session.js";
import { rebuildMirror } from "../services/mirror-sync.js";
import { createSnapshotIfChanged } from "../backup/snapshot.js";

export function registerAdminRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.post("/api/admin/rebuild-mirror", async (req) => {
    rebuildMirror(reqCtx(ctx, req));
    return { ok: true };
  });

  app.post("/api/admin/backup-now", async () => {
    return createSnapshotIfChanged(ctx);
  });
}
