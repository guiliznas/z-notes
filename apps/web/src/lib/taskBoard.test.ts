import { describe, it, expect } from "vitest";
import type { Task, TaskBoard } from "@z-notes/shared";
import { applyTaskUpdate, computeMove, doneTasks, openTasks } from "./taskBoard";

let nextPos = 1;
const task = (id: number, listId: number, over: Partial<Task> = {}): Task => ({
  id,
  listId,
  title: `T${id}`,
  priority: "none",
  position: nextPos++,
  done: false,
  doneAt: null,
  archived: false,
  createdAt: 0,
  updatedAt: 0,
  ...over,
});

const board = (): TaskBoard => ({
  folder: { id: 1, name: "F", position: 1, archived: false, createdAt: 0, updatedAt: 0 },
  lists: [
    {
      id: 10, folderId: 1, name: "A fazer", position: 1, archived: false, createdAt: 0, updatedAt: 0,
      tasks: [task(1, 10), task(2, 10), task(3, 10, { done: true, doneAt: 50 }), task(4, 10)],
    },
    {
      id: 20, folderId: 1, name: "Em andamento", position: 2, archived: false, createdAt: 0, updatedAt: 0,
      tasks: [task(5, 20), task(6, 20)],
    },
    { id: 30, folderId: 1, name: "Vazia", position: 3, archived: false, createdAt: 0, updatedAt: 0, tasks: [] },
  ],
});

const order = (b: TaskBoard, listId: number) => b.lists.find((l) => l.id === listId)!.tasks.map((t) => t.id);

describe("openTasks / doneTasks", () => {
  it("separa abertas e concluídas (mais recentes primeiro)", () => {
    const tasks = [task(1, 1), task(2, 1, { done: true, doneAt: 10 }), task(3, 1, { done: true, doneAt: 99 })];
    expect(openTasks(tasks).map((t) => t.id)).toEqual([1]);
    expect(doneTasks(tasks).map((t) => t.id)).toEqual([3, 2]);
  });
});

describe("applyTaskUpdate", () => {
  it("altera título e prioridade sem mexer na ordem", () => {
    const b = applyTaskUpdate(board(), 2, { title: "Novo", priority: "high" });
    expect(order(b, 10)).toEqual([1, 2, 3, 4]);
    expect(b.lists[0].tasks[1]).toMatchObject({ title: "Novo", priority: "high" });
  });

  it("concluir e reabrir", () => {
    const done = applyTaskUpdate(board(), 1, { done: true }, 777);
    expect(done.lists[0].tasks[0]).toMatchObject({ done: true, doneAt: 777 });
    const reopened = applyTaskUpdate(done, 1, { done: false });
    expect(reopened.lists[0].tasks[0]).toMatchObject({ done: false, doneAt: null });
    expect(order(reopened, 10)).toEqual([1, 2, 3, 4]);
  });

  it("arquivar tira do quadro", () => {
    const b = applyTaskUpdate(board(), 2, { archived: true });
    expect(order(b, 10)).toEqual([1, 3, 4]);
  });

  it("reordenar na mesma lista com afterId", () => {
    expect(order(applyTaskUpdate(board(), 4, { afterId: 1 }), 10)).toEqual([1, 4, 2, 3]);
    expect(order(applyTaskUpdate(board(), 4, { afterId: null }), 10)).toEqual([4, 1, 2, 3]);
  });

  it("mover para outra lista: sem afterId vai ao fim; com afterId encaixa", () => {
    const end = applyTaskUpdate(board(), 1, { listId: 20 });
    expect(order(end, 20)).toEqual([5, 6, 1]);
    expect(order(end, 10)).toEqual([2, 3, 4]);
    expect(end.lists[1].tasks[2].listId).toBe(20);
    expect(order(applyTaskUpdate(board(), 1, { listId: 20, afterId: 5 }), 20)).toEqual([5, 1, 6]);
    expect(order(applyTaskUpdate(board(), 1, { listId: 20, afterId: null }), 20)).toEqual([1, 5, 6]);
    expect(order(applyTaskUpdate(board(), 1, { listId: 30 }), 30)).toEqual([1]);
  });

  it("tarefa inexistente devolve o mesmo quadro", () => {
    const b = board();
    expect(applyTaskUpdate(b, 999, { done: true })).toBe(b);
  });

  it("não altera o quadro original", () => {
    const b = board();
    applyTaskUpdate(b, 1, { listId: 20, done: true });
    expect(order(b, 10)).toEqual([1, 2, 3, 4]);
    expect(b.lists[0].tasks[0].done).toBe(false);
  });
});

describe("computeMove", () => {
  it("mesma lista, para baixo: fica depois da tarefa sobre a qual foi solta", () => {
    // abertas: 1, 2, 4 — arrastar 1 sobre 4 → [2, 4, 1]
    expect(computeMove(board(), 1, { type: "task", id: 4 })).toEqual({ listId: 10, afterId: 4 });
    // arrastar 1 sobre 2 → [2, 1, 4]
    expect(computeMove(board(), 1, { type: "task", id: 2 })).toEqual({ listId: 10, afterId: 2 });
  });

  it("mesma lista, para cima: ocupa o lugar da tarefa de destino", () => {
    // arrastar 4 sobre 1 → [4, 1, 2]
    expect(computeMove(board(), 4, { type: "task", id: 1 })).toEqual({ listId: 10, afterId: null });
    // arrastar 4 sobre 2 → [1, 4, 2]
    expect(computeMove(board(), 4, { type: "task", id: 2 })).toEqual({ listId: 10, afterId: 1 });
  });

  it("outra lista: entra no lugar da tarefa de destino", () => {
    expect(computeMove(board(), 1, { type: "task", id: 5 })).toEqual({ listId: 20, afterId: null });
    expect(computeMove(board(), 1, { type: "task", id: 6 })).toEqual({ listId: 20, afterId: 5 });
  });

  it("soltar sobre a lista vai para o fim das abertas (ou primeiro, se vazia)", () => {
    expect(computeMove(board(), 1, { type: "list", id: 20 })).toEqual({ listId: 20, afterId: 6 });
    expect(computeMove(board(), 1, { type: "list", id: 30 })).toEqual({ listId: 30, afterId: null });
    expect(computeMove(board(), 1, { type: "list", id: 10 })).toEqual({ listId: 10, afterId: 4 });
  });

  it("não há movimento quando nada mudaria", () => {
    expect(computeMove(board(), 1, { type: "task", id: 1 })).toBeNull();
    expect(computeMove(board(), 4, { type: "list", id: 10 })).toBeNull();
  });

  it("ignora destino concluído, inexistente ou origem inexistente", () => {
    expect(computeMove(board(), 1, { type: "task", id: 3 })).toBeNull();
    expect(computeMove(board(), 1, { type: "task", id: 999 })).toBeNull();
    expect(computeMove(board(), 1, { type: "list", id: 999 })).toBeNull();
    expect(computeMove(board(), 999, { type: "list", id: 10 })).toBeNull();
  });

  it("o resultado de computeMove, aplicado no cache, produz a ordem esperada", () => {
    const b = board();
    const move = computeMove(b, 1, { type: "task", id: 4 })!;
    const after = applyTaskUpdate(b, 1, move);
    expect(openTasks(after.lists[0].tasks).map((t) => t.id)).toEqual([2, 4, 1]);
  });
});
