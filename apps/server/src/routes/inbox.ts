import type { FastifyInstance } from "fastify";
import type { AppContext } from "../context.js";
import { reqCtx } from "../auth/session.js";
import {
  ConvertInboxToNoteSchema,
  ConvertInboxToTaskSchema,
  CreateInboxItemSchema,
  IdParam,
  ListInboxQuery,
  UpdateInboxItemSchema,
} from "../validation.js";
import {
  convertInboxToNote,
  convertInboxToTask,
  countPendingInbox,
  createInboxItem,
  deleteInboxItem,
  listInbox,
  updateInboxItem,
} from "../services/inbox.js";

const INBOX_CAPTURE_RATE_LIMIT = { max: 60, timeWindow: "1 minute" };

export function registerInboxRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.get("/api/inbox/count", async (req) => {
    return { count: countPendingInbox(reqCtx(ctx, req)) };
  });

  app.get("/api/inbox", async (req) => {
    const query = ListInboxQuery.parse(req.query);
    return listInbox(reqCtx(ctx, req), query);
  });

  app.post("/api/inbox", { config: { rateLimit: INBOX_CAPTURE_RATE_LIMIT } }, async (req, reply) => {
    const body = CreateInboxItemSchema.parse(req.body);
    const result = createInboxItem(reqCtx(ctx, req), body);
    reply.code(result.created ? 201 : 200);
    return result.item;
  });

  app.patch("/api/inbox/:id", async (req) => {
    const { id } = IdParam.parse(req.params);
    const body = UpdateInboxItemSchema.parse(req.body);
    return updateInboxItem(reqCtx(ctx, req), id, body);
  });

  app.delete("/api/inbox/:id", async (req, reply) => {
    const { id } = IdParam.parse(req.params);
    deleteInboxItem(reqCtx(ctx, req), id);
    reply.code(204);
    return null;
  });

  app.post("/api/inbox/:id/to-task", async (req) => {
    const { id } = IdParam.parse(req.params);
    const { listId } = ConvertInboxToTaskSchema.parse(req.body);
    return convertInboxToTask(reqCtx(ctx, req), id, listId);
  });

  app.post("/api/inbox/:id/to-note", async (req) => {
    const { id } = IdParam.parse(req.params);
    const { folderId } = ConvertInboxToNoteSchema.parse(req.body);
    return convertInboxToNote(reqCtx(ctx, req), id, folderId);
  });
}
