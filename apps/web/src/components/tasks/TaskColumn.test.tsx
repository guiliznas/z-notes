import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import type { Task, TaskListWithTasks } from "@z-notes/shared";
import { TaskColumn } from "./TaskColumn";

let id = 0;
const task = (title: string, over: Partial<Task> = {}): Task => ({
  id: ++id, listId: 10, title, priority: "none", position: id,
  done: false, doneAt: null, archived: false, createdAt: 0, updatedAt: 0, ...over,
});
const list = (tasks: Task[]): TaskListWithTasks => ({
  id: 10, folderId: 1, name: "A fazer", position: 1, archived: false, createdAt: 0, updatedAt: 0, tasks,
});

const actions = () => ({
  onAddTask: vi.fn(), onRenameList: vi.fn(), onArchiveList: vi.fn(), onDeleteList: vi.fn(),
  onArchiveCompleted: vi.fn(), onToggleSort: vi.fn(),
  taskActions: () => ({
    onToggle: vi.fn(), onRename: vi.fn(), onPriority: vi.fn(),
    onArchive: vi.fn(), onMove: vi.fn(), onDelete: vi.fn(),
  }),
});

function setup(tasks: Task[], sorted = false) {
  const a = actions();
  render(<TaskColumn list={list(tasks)} sortedByPriority={sorted} {...a} />);
  return a;
}

const titles = () =>
  screen
    .getAllByRole("checkbox")
    .map((c) => c.getAttribute("aria-label")!.replace(/^.*tarefa: /, ""));

describe("TaskColumn", () => {
  beforeEach(() => vi.clearAllMocks());

  it("mostra o nome da lista e a contagem de abertas", () => {
    setup([task("A"), task("B"), task("C", { done: true, doneAt: 1 })]);
    expect(screen.getByRole("heading", { name: "A fazer" })).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("lista vazia mostra a dica e nenhuma seção de concluídas", () => {
    setup([]);
    expect(screen.getByText(/Nenhuma tarefa\. Digite acima e aperte Enter/)).toBeInTheDocument();
    expect(screen.queryByText(/Concluídas/)).toBeNull();
  });

  describe("adicionar tarefa", () => {
    it("Enter cria e mantém o campo aberto e vazio para a próxima", () => {
      const a = setup([]);
      fireEvent.click(screen.getByRole("button", { name: "Adicionar tarefa" }));
      const input = screen.getByLabelText("Título da nova tarefa");
      fireEvent.change(input, { target: { value: "  Primeira  " } });
      fireEvent.keyDown(input, { key: "Enter" });
      expect(a.onAddTask).toHaveBeenCalledExactlyOnceWith("Primeira");
      expect(screen.getByLabelText("Título da nova tarefa")).toHaveValue("");
    });

    it("Enter com campo vazio não cria; Esc fecha", () => {
      const a = setup([]);
      fireEvent.click(screen.getByRole("button", { name: "Adicionar tarefa" }));
      const input = screen.getByLabelText("Título da nova tarefa");
      fireEvent.keyDown(input, { key: "Enter" });
      expect(a.onAddTask).not.toHaveBeenCalled();
      fireEvent.keyDown(input, { key: "Escape" });
      expect(screen.queryByLabelText("Título da nova tarefa")).toBeNull();
      expect(screen.getByRole("button", { name: "Adicionar tarefa" })).toBeInTheDocument();
    });

    it("sair do campo vazio fecha o campo", () => {
      setup([]);
      fireEvent.click(screen.getByRole("button", { name: "Adicionar tarefa" }));
      fireEvent.blur(screen.getByLabelText("Título da nova tarefa"));
      expect(screen.getByRole("button", { name: "Adicionar tarefa" })).toBeInTheDocument();
    });
  });

  describe("concluídas", () => {
    const tasks = () => [
      task("Aberta"),
      task("Feita antiga", { done: true, doneAt: 10 }),
      task("Feita recente", { done: true, doneAt: 99 }),
    ];

    it("ficam visíveis na própria coluna, as mais recentes primeiro", () => {
      setup(tasks());
      expect(screen.getByText("Concluídas (2)")).toBeInTheDocument();
      expect(titles()).toEqual(["Aberta", "Feita recente", "Feita antiga"]);
    });

    it("o botão Arquivar concluídas dispara o gatilho da lista", () => {
      const a = setup(tasks());
      fireEvent.click(screen.getByRole("button", { name: "Arquivar concluídas" }));
      expect(a.onArchiveCompleted).toHaveBeenCalledOnce();
    });

    it("o menu da lista também oferece Arquivar concluídas com a contagem", () => {
      const a = setup(tasks());
      fireEvent.click(screen.getByRole("button", { name: "Ações da lista A fazer" }));
      fireEvent.click(screen.getByRole("button", { name: "Arquivar concluídas (2)" }));
      expect(a.onArchiveCompleted).toHaveBeenCalledOnce();
    });

    it("sem concluídas o menu não oferece o gatilho", () => {
      setup([task("Aberta")]);
      fireEvent.click(screen.getByRole("button", { name: "Ações da lista A fazer" }));
      expect(screen.queryByRole("button", { name: /Arquivar concluídas/ })).toBeNull();
    });

    it("dá para recolher a seção (e reabrir)", () => {
      setup(tasks());
      const toggle = screen.getByRole("button", { name: /Concluídas \(2\)/ });
      expect(toggle).toHaveAttribute("aria-expanded", "true");
      fireEvent.click(toggle);
      expect(titles()).toEqual(["Aberta"]);
      fireEvent.click(screen.getByRole("button", { name: /Concluídas \(2\)/ }));
      expect(titles()).toHaveLength(3);
    });
  });

  describe("ordenar por prioridade", () => {
    const tasks = () => [
      task("baixa", { priority: "low" }),
      task("alta", { priority: "high" }),
      task("nenhuma"),
      task("média", { priority: "medium" }),
    ];

    it("desligado mantém a ordem manual", () => {
      setup(tasks());
      expect(titles()).toEqual(["baixa", "alta", "nenhuma", "média"]);
    });

    it("ligado ordena do mais urgente ao menos", () => {
      setup(tasks(), true);
      expect(titles()).toEqual(["alta", "média", "baixa", "nenhuma"]);
    });

    it("o item do menu reflete o estado e dispara a alternância", () => {
      const a = setup(tasks(), true);
      fireEvent.click(screen.getByRole("button", { name: "Ações da lista A fazer" }));
      const item = screen.getByRole("button", { name: /Ordenar por prioridade/ });
      expect(within(item).getByRole("img", { name: "ativo" })).toBeInTheDocument();
      fireEvent.click(item);
      expect(a.onToggleSort).toHaveBeenCalledOnce();
    });
  });
});
