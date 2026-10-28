import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Task, TaskBoard } from "@z-notes/shared";

vi.mock("@/hooks/useTasks", () => ({ useUpdateTask: () => ({ mutate: vi.fn() }) }));
vi.mock("../ui/Toast", () => ({ useToast: () => ({ notify: vi.fn() }) }));

import { parseDndId, taskDndId, listDndId, TaskDnd } from "./TaskDnd";
import { TaskColumn } from "./TaskColumn";

describe("ids do arrastar", () => {
  it("gera e interpreta ids de tarefa e de lista", () => {
    expect(parseDndId(taskDndId(12))).toEqual({ type: "task", id: 12 });
    expect(parseDndId(listDndId(3))).toEqual({ type: "list", id: 3 });
  });
  it("rejeita ids que não são nossos", () => {
    for (const bad of ["", "task-", "task-x", "card-1", "list--1", null, undefined, 7]) {
      expect(parseDndId(bad)).toBeNull();
    }
  });
});

let id = 0;
const task = (title: string, over: Partial<Task> = {}): Task => ({
  id: ++id, listId: 10, title, priority: "none", position: id,
  done: false, doneAt: null, archived: false, createdAt: 0, updatedAt: 0, ...over,
});

function setup(enabled: boolean) {
  const tasks = [task("Aberta 1"), task("Aberta 2"), task("Feita", { done: true, doneAt: 1 })];
  const list = { id: 10, folderId: 1, name: "A fazer", position: 1, archived: false, createdAt: 0, updatedAt: 0, tasks };
  const board: TaskBoard = {
    folder: { id: 1, name: "F", position: 1, archived: false, createdAt: 0, updatedAt: 0 },
    lists: [list],
  };
  const noop = vi.fn();
  render(
    <TaskDnd board={board} enabled={enabled}>
      {(w) => (
        <TaskColumn
          list={list}
          sortedByPriority={!enabled}
          onAddTask={noop} onRenameList={noop} onArchiveList={noop} onDeleteList={noop}
          onArchiveCompleted={noop} onToggleSort={noop}
          taskActions={() => ({ onToggle: noop, onRename: noop, onPriority: noop, onArchive: noop, onMove: noop, onDelete: noop })}
          renderOpenTask={w.renderOpenTask}
          wrapOpenList={w.wrapOpenList(list)}
        />
      )}
    </TaskDnd>,
  );
}

describe("TaskDnd", () => {
  it("ligado: cada tarefa aberta ganha uma alça acessível; concluída não", () => {
    setup(true);
    expect(screen.getByRole("button", { name: "Arrastar tarefa: Aberta 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Arrastar tarefa: Aberta 2" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Arrastar tarefa: Feita" })).toBeNull();
  });

  it("a alça é um botão focável (arrastar por teclado)", () => {
    setup(true);
    const handle = screen.getByRole("button", { name: "Arrastar tarefa: Aberta 1" });
    handle.focus();
    expect(handle).toHaveFocus();
    expect(handle).toHaveAttribute("aria-roledescription");
  });

  it("desligado (ordenando por prioridade): sem alças e as tarefas continuam aparecendo", () => {
    setup(false);
    expect(screen.queryByRole("button", { name: /Arrastar tarefa/ })).toBeNull();
    expect(screen.getByText("Aberta 1")).toBeInTheDocument();
    expect(screen.getByText("Aberta 2")).toBeInTheDocument();
  });
});
