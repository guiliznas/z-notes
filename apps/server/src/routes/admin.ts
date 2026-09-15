import type { FastifyInstance } from "fastify";
import type { AppContext } from "../context.js";
import { reqCtx } from "../auth/session.js";
import { rebuildMirror } from "../services/mirror-sync.js";
import { readMetricSeries } from "../services/metrics.js";
import { createSnapshotIfChanged } from "../backup/snapshot.js";

export function registerAdminRoutes(app: FastifyInstance, ctx: AppContext): void {
  // Todas protegidas por requireAdmin no preHandler (routes/index.ts).
  app.get("/api/admin/metrics", async () => ({ series: readMetricSeries(ctx) }));

  app.post("/api/admin/rebuild-mirror", async (req) => {
    rebuildMirror(reqCtx(ctx, req));
    return { ok: true };
  });

  app.post("/api/admin/backup-now", async () => {
    return createSnapshotIfChanged(ctx);
  });
}
