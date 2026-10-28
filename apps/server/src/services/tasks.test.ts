import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { makeTestCtx, type TestCtx } from "../test-helpers.js";
import { upsertUserByGoogle } from "../auth/users.js";
import { computeFingerprint } from "../backup/fingerprint.js";
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
} from "./tasks.js";

describe("tarefas", () => {
  let t: TestCtx;
  beforeEach(() => {
    t = makeTestCtx();
  });
  afterEach(() => {
    t.cleanup();
  });

  function seed() {
    const folder = createTaskFolder(t.ctx, { name: "Lançamento v2" });
    const todo = createTaskList(t.ctx, { folderId: folder.id, name: "A fazer" });
    const doing = createTaskList(t.ctx, { folderId: folder.id, name: "Em andamento" });
    const a = createTask(t.ctx, { listId: todo.id, title: "A", priority: "high" });
    const b = createTask(t.ctx, { listId: todo.id, title: "B" });
    const c = createTask(t.ctx, { listId: todo.id, title: "C", priority: "low" });
    return { folder, todo, doing, a, b, c };
  }

  const ids = (tasks: { id: number }[]) => tasks.map((x) => x.id);
  const boardTasks = (folderId: number, listId: number) =>
    ids(getTaskBoard(t.ctx, folderId).lists.find((l) => l.id === listId)!.tasks);

  describe("criação e leitura", () => {
    it("tarefa nasce aberta, sem prioridade e no fim da lista", () => {
      const { todo, a, b, c } = seed();
      expect(b.priority).toBe("none");
      expect(b.done).toBe(false);
      expect(b.archived).toBe(false);
      expect(a.position).toBeLessThan(b.position);
      expect(b.position).toBeLessThan(c.position);
      expect(createTask(t.ctx, { listId: todo.id, title: "D" }).position).toBeGreaterThan(c.position);
    });

    it("o quadro traz listas (colunas) e tarefas na ordem manual", () => {
      const { folder, todo, doing, a, b, c } = seed();
      const board = getTaskBoard(t.ctx, folder.id);
      expect(board.folder.name).toBe("Lançamento v2");
      expect(board.lists.map((l) => l.id)).toEqual([todo.id, doing.id]);
      expect(ids(board.lists[0].tasks)).toEqual([a.id, b.id, c.id]);
      expect(board.lists[1].tasks).toEqual([]);
    });

    it("openCount conta só abertas: ignora concluídas, arquivadas e listas arquivadas", () => {
      const { folder, todo, doing, a, b } = seed();
      expect(listTaskFolders(t.ctx, "active")[0].openCount).toBe(3);
      updateTask(t.ctx, a.id, { done: true });
      updateTask(t.ctx, b.id, { archived: true });
      expect(listTaskFolders(t.ctx, "active")[0].openCount).toBe(1);
      const other = createTask(t.ctx, { listId: doing.id, title: "X" });
      expect(listTaskFolders(t.ctx, "active")[0].openCount).toBe(2);
      updateTaskList(t.ctx, doing.id, { archived: true });
      expect(listTaskFolders(t.ctx, "active")[0].openCount).toBe(1);
      expect(other.listId).toBe(doing.id);
      expect(folder.id).toBeGreaterThan(0);
      expect(todo.id).toBeGreaterThan(0);
    });
  });

  describe("concluir e prioridade", () => {
    it("concluir marca doneAt; reabrir limpa; concluir de novo não muda o instante", () => {
      const { a } = seed();
      const done = updateTask(t.ctx, a.id, { done: true });
      expect(done.done).toBe(true);
      expect(done.doneAt).not.toBeNull();
      expect(updateTask(t.ctx, a.id, { done: true }).doneAt).toBe(done.doneAt);
      const reopened = updateTask(t.ctx, a.id, { done: false });
      expect(reopened.done).toBe(false);
      expect(reopened.doneAt).toBeNull();
    });

    it("reabrir mantém a posição original na lista", () => {
      const { folder, todo, a, b, c } = seed();
      updateTask(t.ctx, b.id, { done: true });
      updateTask(t.ctx, b.id, { done: false });
      expect(boardTasks(folder.id, todo.id)).toEqual([a.id, b.id, c.id]);
    });

    it("troca título e prioridade", () => {
      const { b } = seed();
      const u = updateTask(t.ctx, b.id, { title: "B2", priority: "medium" });
      expect(u.title).toBe("B2");
      expect(u.priority).toBe("medium");
    });
  });

  describe("reordenar e mover", () => {
    it("afterId null põe a tarefa em primeiro", () => {
      const { folder, todo, a, b, c } = seed();
      updateTask(t.ctx, c.id, { afterId: null });
      expect(boardTasks(folder.id, todo.id)).toEqual([c.id, a.id, b.id]);
    });

    it("afterId coloca depois da tarefa indicada", () => {
      const { folder, todo, a, b, c } = seed();
      updateTask(t.ctx, a.id, { afterId: b.id });
      expect(boardTasks(folder.id, todo.id)).toEqual([b.id, a.id, c.id]);
      updateTask(t.ctx, c.id, { afterId: b.id });
      expect(boardTasks(folder.id, todo.id)).toEqual([b.id, c.id, a.id]);
    });

    it("mover para outra lista sem afterId vai para o fim da lista de destino", () => {
      const { folder, todo, doing, a, b, c } = seed();
      const x = createTask(t.ctx, { listId: doing.id, title: "X" });
      updateTask(t.ctx, a.id, { listId: doing.id });
      expect(boardTasks(folder.id, doing.id)).toEqual([x.id, a.id]);
      expect(boardTasks(folder.id, todo.id)).toEqual([b.id, c.id]);
    });

    it("mover para outra lista com afterId encaixa na posição pedida", () => {
      const { folder, doing, a, b } = seed();
      const x = createTask(t.ctx, { listId: doing.id, title: "X" });
      const y = createTask(t.ctx, { listId: doing.id, title: "Y" });
      updateTask(t.ctx, a.id, { listId: doing.id, afterId: x.id });
      expect(boardTasks(folder.id, doing.id)).toEqual([x.id, a.id, y.id]);
      updateTask(t.ctx, b.id, { listId: doing.id, afterId: null });
      expect(boardTasks(folder.id, doing.id)).toEqual([b.id, x.id, a.id, y.id]);
    });

    it("afterId de outra lista ou do próprio item é inválido", () => {
      const { doing, a, b } = seed();
      const x = createTask(t.ctx, { listId: doing.id, title: "X" });
      expect(() => updateTask(t.ctx, a.id, { afterId: x.id })).toThrow(/inválida/);
      expect(() => updateTask(t.ctx, a.id, { afterId: a.id })).toThrow(/inválida/);
      expect(() => updateTask(t.ctx, b.id, { afterId: 99999 })).toThrow(/inválida/);
    });

    it("reordenar listas dentro da pasta", () => {
      const { folder, todo, doing } = seed();
      const third = createTaskList(t.ctx, { folderId: folder.id, name: "Revisar" });
      updateTaskList(t.ctx, third.id, { afterId: null });
      expect(getTaskBoard(t.ctx, folder.id).lists.map((l) => l.id)).toEqual([third.id, todo.id, doing.id]);
      updateTaskList(t.ctx, third.id, { afterId: todo.id });
      expect(getTaskBoard(t.ctx, folder.id).lists.map((l) => l.id)).toEqual([todo.id, third.id, doing.id]);
    });

    it("reordenar pastas", () => {
      const a = createTaskFolder(t.ctx, { name: "A" });
      const b = createTaskFolder(t.ctx, { name: "B" });
      updateTaskFolder(t.ctx, b.id, { afterId: null });
      expect(listTaskFolders(t.ctx, "active").map((f) => f.id)).toEqual([b.id, a.id]);
    });

    it("muitas reordenações no mesmo vão preservam a ordem (rebalanceamento)", () => {
      const { folder, todo, a, b } = seed();
      const extra = Array.from({ length: 60 }, (_, i) => createTask(t.ctx, { listId: todo.id, title: `E${i}` }));
      for (const e of extra) updateTask(t.ctx, e.id, { afterId: a.id });
      const order = boardTasks(folder.id, todo.id);
      expect(order[0]).toBe(a.id);
      expect(order.slice(1, 61)).toEqual([...extra].reverse().map((e) => e.id));
      expect(order.includes(b.id)).toBe(true);
      const positions = getTaskBoard(t.ctx, folder.id).lists[0].tasks.map((x) => x.position);
      expect(positions).toEqual([...positions].sort((x, y) => x - y));
      expect(new Set(positions).size).toBe(positions.length);
    });
  });

  describe("arquivar e restaurar", () => {
    it("tarefa arquivada sai do quadro, aparece em Arquivadas e restaura no fim da lista", () => {
      const { folder, todo, a, b, c } = seed();
      updateTask(t.ctx, a.id, { archived: true });
      expect(boardTasks(folder.id, todo.id)).toEqual([b.id, c.id]);
      const archive = getTaskArchive(t.ctx);
      expect(archive.tasks.map((x) => x.id)).toEqual([a.id]);
      expect(archive.tasks[0]).toMatchObject({ listName: "A fazer", folderName: "Lançamento v2", folderId: folder.id });
      updateTask(t.ctx, a.id, { archived: false });
      expect(boardTasks(folder.id, todo.id)).toEqual([b.id, c.id, a.id]);
      expect(getTaskArchive(t.ctx).tasks).toEqual([]);
    });

    it("arquivar concluídas devolve só os ids das concluídas e ainda não arquivadas", () => {
      const { folder, todo, a, b, c } = seed();
      updateTask(t.ctx, a.id, { done: true });
      updateTask(t.ctx, c.id, { done: true });
      updateTask(t.ctx, c.id, { archived: true });
      const archived = archiveCompleted(t.ctx, todo.id);
      expect(archived).toEqual([a.id]);
      expect(boardTasks(folder.id, todo.id)).toEqual([b.id]);
      expect(archiveCompleted(t.ctx, todo.id)).toEqual([]);
    });

    it("Desfazer (restaurar em lote) devolve cada tarefa à posição original", () => {
      const { folder, todo, a, b, c } = seed();
      updateTask(t.ctx, a.id, { done: true });
      updateTask(t.ctx, c.id, { done: true });
      const archived = archiveCompleted(t.ctx, todo.id);
      const restored = setTasksArchived(t.ctx, archived, false);
      expect(restored.every((x) => !x.archived)).toBe(true);
      expect(boardTasks(folder.id, todo.id)).toEqual([a.id, b.id, c.id]);
    });

    it("lista arquivada some do quadro e leva as tarefas junto; restaurar traz tudo", () => {
      const { folder, todo, doing, a } = seed();
      updateTaskList(t.ctx, todo.id, { archived: true });
      expect(getTaskBoard(t.ctx, folder.id).lists.map((l) => l.id)).toEqual([doing.id]);
      const archive = getTaskArchive(t.ctx);
      expect(archive.lists).toHaveLength(1);
      expect(archive.lists[0]).toMatchObject({ id: todo.id, folderName: "Lançamento v2", taskCount: 3 });
      expect(archive.tasks).toEqual([]);
      updateTaskList(t.ctx, todo.id, { archived: false });
      expect(getTaskBoard(t.ctx, folder.id).lists.map((l) => l.id)).toEqual([doing.id, todo.id]);
      expect(boardTasks(folder.id, todo.id)).toContain(a.id);
    });

    it("tarefa arquivada dentro de lista arquivada aparece só com a lista, e continua arquivada ao restaurar a lista", () => {
      const { folder, todo, a } = seed();
      updateTask(t.ctx, a.id, { archived: true });
      updateTaskList(t.ctx, todo.id, { archived: true });
      expect(getTaskArchive(t.ctx).tasks).toEqual([]);
      updateTaskList(t.ctx, todo.id, { archived: false });
      expect(boardTasks(folder.id, todo.id)).not.toContain(a.id);
      expect(getTaskArchive(t.ctx).tasks.map((x) => x.id)).toEqual([a.id]);
    });

    it("pasta arquivada sai da lista ativa, aparece em Arquivadas e restaura no fim", () => {
      const { folder } = seed();
      const other = createTaskFolder(t.ctx, { name: "Casa" });
      updateTaskFolder(t.ctx, folder.id, { archived: true });
      expect(listTaskFolders(t.ctx, "active").map((f) => f.id)).toEqual([other.id]);
      const archive = getTaskArchive(t.ctx);
      expect(archive.folders).toHaveLength(1);
      expect(archive.folders[0]).toMatchObject({ id: folder.id, listCount: 2 });
      expect(archive.lists).toEqual([]);
      updateTaskFolder(t.ctx, folder.id, { archived: false });
      expect(listTaskFolders(t.ctx, "active").map((f) => f.id)).toEqual([other.id, folder.id]);
      expect(listTaskFolders(t.ctx, "archived")).toEqual([]);
    });

    it("não cria lista em pasta arquivada, nem tarefa em lista arquivada, nem move para ela", () => {
      const { folder, todo, doing, a } = seed();
      updateTaskList(t.ctx, doing.id, { archived: true });
      expect(() => createTask(t.ctx, { listId: doing.id, title: "X" })).toThrow(/arquivada/);
      expect(() => updateTask(t.ctx, a.id, { listId: doing.id })).toThrow(/arquivada/);
      updateTaskFolder(t.ctx, folder.id, { archived: true });
      expect(() => createTaskList(t.ctx, { folderId: folder.id, name: "Nova" })).toThrow(/arquivada/);
      expect(todo.id).toBeGreaterThan(0);
    });
  });

  describe("exclusão", () => {
    it("excluir tarefa e lista", () => {
      const { folder, todo, a } = seed();
      deleteTask(t.ctx, a.id);
      expect(boardTasks(folder.id, todo.id)).not.toContain(a.id);
      deleteTaskList(t.ctx, todo.id);
      expect(getTaskBoard(t.ctx, folder.id).lists.map((l) => l.name)).toEqual(["Em andamento"]);
    });

    it("excluir a pasta apaga listas e tarefas em cascata", () => {
      const { folder } = seed();
      deleteTaskFolder(t.ctx, folder.id);
      const count = (table: string) => (t.ctx.sqlite.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get() as { c: number }).c;
      expect([count("task_folders"), count("task_lists"), count("tasks")]).toEqual([0, 0, 0]);
    });
  });

  describe("isolamento entre usuários (404, nunca 403)", () => {
    it("outro usuário não vê, edita, move nem apaga nada", () => {
      const { folder, todo, doing, a } = seed();
      const other = upsertUserByGoogle(t.ctx, { sub: "outro", email: "outro@example.com" });
      const o = { ...t.ctx, userId: other.id };

      expect(listTaskFolders(o, "active")).toEqual([]);
      expect(() => getTaskBoard(o, folder.id)).toThrow(/não encontrada/);
      expect(() => updateTaskFolder(o, folder.id, { name: "x" })).toThrow(/não encontrada/);
      expect(() => deleteTaskFolder(o, folder.id)).toThrow(/não encontrada/);
      expect(() => createTaskList(o, { folderId: folder.id, name: "x" })).toThrow(/não encontrada/);
      expect(() => updateTaskList(o, todo.id, { archived: true })).toThrow(/não encontrada/);
      expect(() => archiveCompleted(o, todo.id)).toThrow(/não encontrada/);
      expect(() => createTask(o, { listId: todo.id, title: "x" })).toThrow(/não encontrada/);
      expect(() => updateTask(o, a.id, { title: "x" })).toThrow(/não encontrada/);
      expect(() => deleteTask(o, a.id)).toThrow(/não encontrada/);
      expect(getTaskArchive(o)).toEqual({ folders: [], lists: [], tasks: [] });

      // Tarefa do outro não pode ser movida para a lista de outra pessoa.
      const mine = createTaskFolder(o, { name: "Minha" });
      const myList = createTaskList(o, { folderId: mine.id, name: "L" });
      const myTask = createTask(o, { listId: myList.id, title: "T" });
      expect(() => updateTask(o, myTask.id, { listId: doing.id })).toThrow(/não encontrada/);
      expect(() => updateTask(t.ctx, a.id, { listId: myList.id })).toThrow(/não encontrada/);
    });

    it("arquivar em lote com um id alheio falha inteiro e não altera nada", () => {
      const { folder, todo, a, b } = seed();
      const other = upsertUserByGoogle(t.ctx, { sub: "outro", email: "outro@example.com" });
      const o = { ...t.ctx, userId: other.id };
      const f = createTaskFolder(o, { name: "F" });
      const l = createTaskList(o, { folderId: f.id, name: "L" });
      const foreign = createTask(o, { listId: l.id, title: "alheia" });
      expect(() => setTasksArchived(t.ctx, [a.id, b.id, foreign.id], true)).toThrow(/não encontrada/);
      expect(boardTasks(folder.id, todo.id)).toContain(a.id);
      expect(boardTasks(folder.id, todo.id)).toContain(b.id);
    });
  });

  describe("backup", () => {
    it("o fingerprint muda ao criar, reordenar, concluir, arquivar e excluir", () => {
      const { todo, a, b } = seed();
      const seen = new Set<string>([computeFingerprint(t.ctx)]);
      const step = (fn: () => void) => {
        fn();
        const fp = computeFingerprint(t.ctx);
        expect(seen.has(fp)).toBe(false);
        seen.add(fp);
      };
      step(() => createTask(t.ctx, { listId: todo.id, title: "novo" }));
      step(() => updateTask(t.ctx, a.id, { afterId: b.id }));
      step(() => updateTask(t.ctx, a.id, { done: true }));
      step(() => updateTask(t.ctx, a.id, { archived: true }));
      step(() => updateTaskList(t.ctx, todo.id, { name: "renomeada" }));
      step(() => deleteTask(t.ctx, b.id));
    });
  });
});
