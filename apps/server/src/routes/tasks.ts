import type { FastifyInstance } from "fastify";
import type { AppContext } from "../context.js";
import { reqCtx } from "../auth/session.js";
import {
  BatchArchiveTasksSchema,
  CreateTaskFolderSchema,
  CreateTaskListSchema,
  CreateTaskSchema,
  IdParam,
  TaskFoldersQuery,
  UpdateTaskFolderSchema,
  UpdateTaskListSchema,
  UpdateTaskSchema,
} from "../validation.js";
import {
  archiveCompleted,
  createTask,
  createTaskFolder,
  createTaskList,
  deleteTask,
  deleteTaskFolder,
  deleteTaskList,
  getTaskArchive,
  getTaskBoard,
  listTaskFolders,
  setTasksArchived,
  updateTask,
  updateTaskFolder,
  updateTaskList,
} from "../services/tasks.js";

export function registerTaskRoutes(app: FastifyInstance, ctx: AppContext): void {
  /* pastas de tarefas (quadros) */
  app.get("/api/task-folders", async (req) => {
    const { view } = TaskFoldersQuery.parse(req.query);
    return listTaskFolders(reqCtx(ctx, req), view);
  });

  app.post("/api/task-folders", async (req, reply) => {
    const body = CreateTaskFolderSchema.parse(req.body);
    reply.code(201);
    return createTaskFolder(reqCtx(ctx, req), body);
  });

  app.patch("/api/task-folders/:id", async (req) => {
    const { id } = IdParam.parse(req.params);
    return updateTaskFolder(reqCtx(ctx, req), id, UpdateTaskFolderSchema.parse(req.body));
  });

  app.delete("/api/task-folders/:id", async (req, reply) => {
    const { id } = IdParam.parse(req.params);
    deleteTaskFolder(reqCtx(ctx, req), id);
    reply.code(204);
    return null;
  });

  app.get("/api/task-folders/:id/board", async (req) => {
    const { id } = IdParam.parse(req.params);
    return getTaskBoard(reqCtx(ctx, req), id);
  });

  /* listas (colunas) */
  app.post("/api/task-lists", async (req, reply) => {
    const body = CreateTaskListSchema.parse(req.body);
    reply.code(201);
    return createTaskList(reqCtx(ctx, req), body);
  });

  app.patch("/api/task-lists/:id", async (req) => {
    const { id } = IdParam.parse(req.params);
    return updateTaskList(reqCtx(ctx, req), id, UpdateTaskListSchema.parse(req.body));
  });

  app.delete("/api/task-lists/:id", async (req, reply) => {
    const { id } = IdParam.parse(req.params);
    deleteTaskList(reqCtx(ctx, req), id);
    reply.code(204);
    return null;
  });

  app.post("/api/task-lists/:id/archive-completed", async (req) => {
    const { id } = IdParam.parse(req.params);
    return { ids: archiveCompleted(reqCtx(ctx, req), id) };
  });

  /* tarefas */
  app.post("/api/tasks", async (req, reply) => {
    const body = CreateTaskSchema.parse(req.body);
    reply.code(201);
    return createTask(reqCtx(ctx, req), body);
  });

  app.patch("/api/tasks/:id", async (req) => {
    const { id } = IdParam.parse(req.params);
    return updateTask(reqCtx(ctx, req), id, UpdateTaskSchema.parse(req.body));
  });

  app.delete("/api/tasks/:id", async (req, reply) => {
    const { id } = IdParam.parse(req.params);
    deleteTask(reqCtx(ctx, req), id);
    reply.code(204);
    return null;
  });

  app.post("/api/tasks/archive", async (req) => {
    const { ids, archived } = BatchArchiveTasksSchema.parse(req.body);
    return setTasksArchived(reqCtx(ctx, req), ids, archived);
  });

  app.get("/api/task-archive", async (req) => getTaskArchive(reqCtx(ctx, req)));
}
