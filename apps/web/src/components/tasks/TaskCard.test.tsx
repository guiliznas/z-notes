import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Task } from "@z-notes/shared";
import { TaskCard } from "./TaskCard";

const base: Task = {
  id: 1, listId: 10, title: "Testar deep link", priority: "none", position: 1,
  done: false, doneAt: null, archived: false, createdAt: 0, updatedAt: 0,
};

const handlers = () => ({
  onToggle: vi.fn(), onRename: vi.fn(), onPriority: vi.fn(),
  onArchive: vi.fn(), onMove: vi.fn(), onDelete: vi.fn(),
});

function setup(task: Partial<Task> = {}) {
  const h = handlers();
  render(<TaskCard task={{ ...base, ...task }} {...h} />);
  return h;
}

describe("TaskCard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("mostra o título e a prioridade com texto (não só cor)", () => {
    setup({ priority: "high" });
    expect(screen.getByText("Testar deep link")).toBeInTheDocument();
    expect(screen.getByText("Alta")).toBeInTheDocument();
  });

  it("sem prioridade não mostra chip, só o atalho para definir", () => {
    setup();
    expect(screen.queryByText("Alta")).toBeNull();
    expect(screen.getByRole("button", { name: "Definir prioridade" })).toBeInTheDocument();
  });

  it("o círculo conclui a tarefa e expõe o estado como checkbox acessível", () => {
    const h = setup();
    const box = screen.getByRole("checkbox", { name: /Concluir tarefa: Testar deep link/ });
    expect(box).toHaveAttribute("aria-checked", "false");
    fireEvent.click(box);
    expect(h.onToggle).toHaveBeenCalledOnce();
  });

  it("concluída aparece riscada, marcada e sem seletor de prioridade", () => {
    setup({ done: true, doneAt: 5, priority: "high" });
    const box = screen.getByRole("checkbox", { name: /Reabrir tarefa/ });
    expect(box).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("Testar deep link")).toHaveClass("line-through");
    expect(screen.queryByText("Alta")).toBeNull();
  });

  describe("edição do título", () => {
    const startEdit = () => fireEvent.click(screen.getByText("Testar deep link"));

    it("Enter salva o título aparado", () => {
      const h = setup();
      startEdit();
      const input = screen.getByLabelText("Título da tarefa");
      fireEvent.change(input, { target: { value: "  Novo título  " } });
      fireEvent.keyDown(input, { key: "Enter" });
      expect(h.onRename).toHaveBeenCalledExactlyOnceWith("Novo título");
      expect(screen.queryByLabelText("Título da tarefa")).toBeNull();
    });

    it("Esc cancela sem salvar", () => {
      const h = setup();
      startEdit();
      const input = screen.getByLabelText("Título da tarefa");
      fireEvent.change(input, { target: { value: "Outro" } });
      fireEvent.keyDown(input, { key: "Escape" });
      expect(h.onRename).not.toHaveBeenCalled();
      expect(screen.getByText("Testar deep link")).toBeInTheDocument();
    });

    it("título vazio ou igual não dispara salvamento", () => {
      const h = setup();
      startEdit();
      fireEvent.change(screen.getByLabelText("Título da tarefa"), { target: { value: "   " } });
      fireEvent.keyDown(screen.getByLabelText("Título da tarefa"), { key: "Enter" });
      startEdit();
      fireEvent.keyDown(screen.getByLabelText("Título da tarefa"), { key: "Enter" });
      expect(h.onRename).not.toHaveBeenCalled();
    });

    it("sair do campo (blur) salva, e Enter seguido de blur não salva duas vezes", () => {
      const h = setup();
      startEdit();
      const input = screen.getByLabelText("Título da tarefa");
      fireEvent.change(input, { target: { value: "Pelo blur" } });
      fireEvent.keyDown(input, { key: "Enter" });
      fireEvent.blur(input);
      expect(h.onRename).toHaveBeenCalledTimes(1);
    });
  });

  it("escolher prioridade no menu envia o nível", () => {
    const h = setup({ priority: "low" });
    fireEvent.click(screen.getByRole("button", { name: /Prioridade Baixa: alterar/ }));
    fireEvent.click(screen.getByRole("button", { name: /Alta/ }));
    expect(h.onPriority).toHaveBeenCalledWith("high");
  });

  it("o menu da tarefa oferece mover, arquivar e excluir", () => {
    const h = setup();
    const open = () => fireEvent.click(screen.getByRole("button", { name: /Ações da tarefa/ }));
    open();
    fireEvent.click(screen.getByRole("button", { name: "Arquivar tarefa" }));
    expect(h.onArchive).toHaveBeenCalledOnce();
    open();
    fireEvent.click(screen.getByRole("button", { name: "Mover para…" }));
    expect(h.onMove).toHaveBeenCalledOnce();
    open();
    fireEvent.click(screen.getByRole("button", { name: "Excluir tarefa" }));
    expect(h.onDelete).toHaveBeenCalledOnce();
  });
});
