import type { FastifyInstance } from "fastify";
import type { AppContext } from "../context.js";
import { CreateFolderSchema, UpdateFolderSchema, IdParam } from "../validation.js";
import { listFolderTree, createFolder, updateFolder, deleteFolder } from "../services/folders.js";

export function registerFolderRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.get("/api/folders", async () => listFolderTree(ctx));

  app.post("/api/folders", async (req, reply) => {
    const body = CreateFolderSchema.parse(req.body);
    reply.code(201);
    return createFolder(ctx, body);
  });

  app.patch("/api/folders/:id", async (req) => {
    const { id } = IdParam.parse(req.params);
    const body = UpdateFolderSchema.parse(req.body);
    return updateFolder(ctx, id, body);
  });

  app.delete("/api/folders/:id", async (req, reply) => {
    const { id } = IdParam.parse(req.params);
    deleteFolder(ctx, id);
    reply.code(204);
    return null;
  });
}
