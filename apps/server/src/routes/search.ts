import type { FastifyInstance } from "fastify";
import type { AppContext } from "../context.js";
import { SearchQuery } from "../validation.js";
import { searchNotes } from "../services/search.js";

export function registerSearchRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.get("/api/search", async (req) => {
    const { q, folder } = SearchQuery.parse(req.query);
    return searchNotes(ctx, q, folder ?? null);
  });
}
