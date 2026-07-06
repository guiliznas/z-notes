import type { FastifyInstance } from "fastify";
import type { AppContext } from "../context.js";
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
    return listNotes(ctx, { folderId: folder ?? null, view });
  });

  app.get("/api/notes/:id", async (req) => {
    const { id } = IdParam.parse(req.params);
    return getNote(ctx, id);
  });

  app.post("/api/notes", async (req, reply) => {
    const body = CreateNoteSchema.parse(req.body);
    reply.code(201);
    return createNote(ctx, body);
  });

  app.patch("/api/notes/:id", async (req) => {
    const { id } = IdParam.parse(req.params);
    const body = UpdateNoteSchema.parse(req.body);
    return updateNote(ctx, id, body);
  });

  app.delete("/api/notes/:id", async (req, reply) => {
    const { id } = IdParam.parse(req.params);
    const { hard } = DeleteNoteQuery.parse(req.query);
    if (hard) {
      hardDeleteNote(ctx, id);
    } else {
      trashNote(ctx, id);
    }
    reply.code(204);
    return null;
  });

  app.post("/api/notes/:id/restore", async (req) => {
    const { id } = IdParam.parse(req.params);
    return restoreNote(ctx, id);
  });
}
