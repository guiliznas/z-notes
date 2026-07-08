import fs from "node:fs";
import Fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import { ZodError } from "zod";
import type { AppConfig } from "./config.js";
import { WEB_DIST } from "./config.js";
import { openDatabase } from "./db/bootstrap.js";
import { HttpError } from "./errors.js";
import { registerApiRoutes } from "./routes/index.js";
import { scheduleBackups } from "./backup/scheduler.js";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export async function buildApp(cfg: AppConfig): Promise<FastifyInstance> {
  const { sqlite, db } = openDatabase(cfg.dbPath);
  const ctx = { db, sqlite, cfg };
  const app = Fastify({ logger: cfg.isProd, bodyLimit: MAX_UPLOAD_BYTES });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });
  await app.register(cookie, { secret: cfg.sessionSecret });
  await app.register(multipart, { limits: { fileSize: MAX_UPLOAD_BYTES, files: 500 } });
  await app.register(rateLimit, { global: false });

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ZodError) {
      reply.code(400).send({ error: "bad_request", message: err.issues.map((e) => e.message).join("; ") });
      return;
    }
    if (err instanceof HttpError) {
      reply.code(err.statusCode).send({ error: err.code, message: err.message });
      return;
    }
    const anyErr = err as { statusCode?: number; message?: string };
    const statusCode = typeof anyErr.statusCode === "number" ? anyErr.statusCode : 500;
    if (statusCode >= 500) req.log.error(err);
    reply.code(statusCode).send({
      error: "internal",
      message: statusCode >= 500 ? "Erro interno" : anyErr.message ?? "Erro",
    });
  });

  registerApiRoutes(app, ctx);
  registerStaticOrFallback(app);

  const backupTask = scheduleBackups(ctx);
  app.addHook("onClose", async () => {
    backupTask.stop();
    sqlite.close();
  });
  return app;
}

function registerStaticOrFallback(app: FastifyInstance): void {
  if (fs.existsSync(WEB_DIST)) {
    app.register(fastifyStatic, { root: WEB_DIST });
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith("/api/")) {
        reply.code(404).send({ error: "not_found", message: "Rota não encontrada" });
        return;
      }
      reply.sendFile("index.html");
    });
  } else {
    app.setNotFoundHandler((_req, reply) => {
      reply.code(404).send({ error: "not_found", message: "Rota não encontrada" });
    });
  }
}