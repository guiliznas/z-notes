import type { FastifyInstance } from "fastify";
import type { AppContext } from "../context.js";
import { reqCtx } from "../auth/session.js";
import { SearchQuery } from "../validation.js";
import { searchNotes } from "../services/search.js";

export function registerSearchRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.get("/api/search", async (req) => {
    const { q, folder } = SearchQuery.parse(req.query);
    return searchNotes(reqCtx(ctx, req), q, folder ?? null);
  });
}
