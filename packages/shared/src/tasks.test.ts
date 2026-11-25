import { describe, it, expect } from "vitest";
import { priorityRank, sortByPriority, TASK_PRIORITIES, type TaskPriority } from "./tasks.js";

describe("prioridade de tarefas", () => {
  it("lista os quatro níveis, do menor ao maior", () => {
    expect(TASK_PRIORITIES).toEqual(["none", "low", "medium", "high"]);
    expect(TASK_PRIORITIES.map(priorityRank)).toEqual([0, 1, 2, 3]);
  });

  it("sortByPriority põe a mais urgente primeiro e preserva a ordem manual entre iguais", () => {
    const items: { id: number; priority: TaskPriority }[] = [
      { id: 1, priority: "low" },
      { id: 2, priority: "high" },
      { id: 3, priority: "none" },
      { id: 4, priority: "high" },
      { id: 5, priority: "medium" },
      { id: 6, priority: "low" },
    ];
    expect(sortByPriority(items).map((i) => i.id)).toEqual([2, 4, 5, 1, 6, 3]);
  });

  it("não altera o array original", () => {
    const items = [
      { id: 1, priority: "low" as const },
      { id: 2, priority: "high" as const },
    ];
    sortByPriority(items);
    expect(items.map((i) => i.id)).toEqual([1, 2]);
  });
});
