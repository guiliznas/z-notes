import type { FastifyInstance } from "fastify";
import type { AppContext } from "../context.js";
import { badRequest } from "../errors.js";
import { importEntries, zipToEntries, exportZip, type ImportEntry } from "../services/io.js";

export function registerIoRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.post("/api/import", async (req) => {
    if (!req.isMultipart()) throw badRequest("Envie os arquivos como multipart/form-data");
    const entries: ImportEntry[] = [];
    for await (const part of req.parts()) {
      if (part.type !== "file") continue;
      const buffer = await part.toBuffer();
      const name = part.filename ?? "";
      const lower = name.toLowerCase();
      if (lower.endsWith(".zip")) {
        entries.push(...(await zipToEntries(buffer)));
      } else if (lower.endsWith(".md") || lower.endsWith(".markdown") || lower.endsWith(".txt")) {
        const parts = name.split("/").filter(Boolean);
        entries.push({ folderSegments: parts.slice(0, -1), content: buffer.toString("utf8") });
      }
    }
    if (entries.length === 0) throw badRequest("Nenhum arquivo .md ou .zip válido encontrado");
    return importEntries(ctx, entries);
  });

  app.get("/api/export", async (_req, reply) => {
    const buffer = await exportZip(ctx);
    reply.header("Content-Type", "application/zip");
    reply.header("Content-Disposition", 'attachment; filename="z-notes-backup.zip"');
    return reply.send(buffer);
  });
}
