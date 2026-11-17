import type { FastifyInstance } from "fastify";
import type { AppContext } from "../context.js";
import { reqCtx } from "../auth/session.js";
import { CreateApiTokenSchema, IdParam } from "../validation.js";
import { generateApiToken, listApiTokens, revokeApiToken } from "../services/tokens.js";

export function registerTokenRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.get("/api/tokens", async (req) => {
    return listApiTokens(reqCtx(ctx, req));
  });

  app.post("/api/tokens", async (req, reply) => {
    const body = CreateApiTokenSchema.parse(req.body);
    const result = generateApiToken(reqCtx(ctx, req), body);
    reply.code(201);
    return result;
  });

  app.delete("/api/tokens/:id", async (req) => {
    const { id } = IdParam.parse(req.params);
    return revokeApiToken(reqCtx(ctx, req), id);
  });
}
