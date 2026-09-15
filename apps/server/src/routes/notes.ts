import type { FastifyInstance } from "fastify";
import type { AppContext } from "../context.js";
import { reqCtx } from "../auth/session.js";
import { CreateNoteSchema, UpdateNoteSchema, ListNotesQuery, IdParam, DeleteNoteQuery } from "../validation.js";
import {
  listNotes,
  getNote,
  createNote,
  updateNote,
  trashNote,
  restoreNote,
  hardDeleteNote,
} from "../services/notes.js";

export function registerNoteRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.get("/api/notes", async (req) => {
    const { folder, view } = ListNotesQuery.parse(req.query);
    return listNotes(reqCtx(ctx, req), { folderId: folder ?? null, view });
  });

  app.get("/api/notes/:id", async (req) => {
    const { id } = IdParam.parse(req.params);
    return getNote(reqCtx(ctx, req), id);
  });

  app.post("/api/notes", async (req, reply) => {
    const body = CreateNoteSchema.parse(req.body);
    reply.code(201);
    return createNote(reqCtx(ctx, req), body);
  });

  app.patch("/api/notes/:id", async (req) => {
    const { id } = IdParam.parse(req.params);
    const body = UpdateNoteSchema.parse(req.body);
    return updateNote(reqCtx(ctx, req), id, body);
  });

  app.delete("/api/notes/:id", async (req, reply) => {
    const { id } = IdParam.parse(req.params);
    const { hard } = DeleteNoteQuery.parse(req.query);
    if (hard) {
      hardDeleteNote(reqCtx(ctx, req), id);
    } else {
      trashNote(reqCtx(ctx, req), id);
    }
    reply.code(204);
    return null;
  });

  app.post("/api/notes/:id/restore", async (req) => {
    const { id } = IdParam.parse(req.params);
    return restoreNote(reqCtx(ctx, req), id);
  });
}
