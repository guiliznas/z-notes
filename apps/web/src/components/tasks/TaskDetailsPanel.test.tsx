import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Task } from "@z-notes/shared";

const h = vi.hoisted(() => ({
  updateTaskMutate: vi.fn(),
  online: true,
}));

vi.mock("@/hooks/useOnline", () => ({ useOnline: () => h.online }));
vi.mock("@/hooks/useTasks", () => ({
  useUpdateTask: () => ({ mutate: h.updateTaskMutate, isPending: false }),
}));

import { TaskDetailsPanel } from "./TaskDetailsPanel";

const baseTask: Task = {
  id: 42,
  listId: 10,
  title: "Definir schema do banco",
  contentMd: "## Especificações\n- [ ] Tabela tasks\n- [x] Tabela notes",
  priority: "high",
  position: 1,
  done: false,
  doneAt: null,
  archived: false,
  createdAt: 1000,
  updatedAt: 1000,
};

describe("TaskDetailsPanel", () => {
  const onClose = vi.fn();
  const onConvertToNote = vi.fn();
  const onArchive = vi.fn();
  const onDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    h.online = true;
  });

  function setup(task: Partial<Task> = {}) {
    return render(
      <TaskDetailsPanel
        task={{ ...baseTask, ...task }}
        listName="A fazer"
        onClose={onClose}
        onConvertToNote={onConvertToNote}
        onArchive={onArchive}
        onDelete={onDelete}
      />,
    );
  }

  it("renderiza cabeçalho, nome da lista, título e prioridade", () => {
    setup();
    expect(screen.getByText("A fazer")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Definir schema do banco")).toBeInTheDocument();
    expect(screen.getByText("Alta")).toBeInTheDocument();
  });

  it("abre em modo visualização por padrão (critério da issue #29)", () => {
    setup();
    expect(screen.getByRole("button", { name: "Visualizar" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("task-content-preview")).toBeInTheDocument();
    expect(screen.getByText("Especificações")).toBeInTheDocument();
    expect(screen.queryByLabelText("Conteúdo em markdown da tarefa")).toBeNull();
  });

  it("duplo clique no preview entra no modo de edição", () => {
    setup();
    const preview = screen.getByTestId("task-content-preview");
    fireEvent.doubleClick(preview);

    const textarea = screen.getByLabelText("Conteúdo em markdown da tarefa");
    expect(textarea).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editar" })).toHaveAttribute("aria-pressed", "true");
  });

  it("alternador manual Visualizar / Editar alterna o modo", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    expect(screen.getByLabelText("Conteúdo em markdown da tarefa")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Visualizar" }));
    expect(screen.getByTestId("task-content-preview")).toBeInTheDocument();
  });

  it("editar o título e sair do campo dispara updateTask", () => {
    setup();
    const titleInput = screen.getByLabelText("Título da tarefa nos detalhes");
    fireEvent.change(titleInput, { target: { value: "Novo título de tarefa" } });
    fireEvent.blur(titleInput);

    expect(h.updateTaskMutate).toHaveBeenCalledWith({
      id: 42,
      title: "Novo título de tarefa",
    });
  });

  it("concluir ou reabrir tarefa dispara updateTask com done", () => {
    setup();
    const checkBtn = screen.getByRole("checkbox", { name: "Concluir tarefa" });
    fireEvent.click(checkBtn);

    expect(h.updateTaskMutate).toHaveBeenCalledWith({
      id: 42,
      done: true,
    });
  });

  it("menu de ações oferece Converter em nota, Arquivar e Excluir", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Ações da tarefa" }));

    fireEvent.click(screen.getByRole("button", { name: "Converter em nota" }));
    expect(onConvertToNote).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "Ações da tarefa" }));
    fireEvent.click(screen.getByRole("button", { name: "Arquivar tarefa" }));
    expect(onArchive).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "Ações da tarefa" }));
    fireEvent.click(screen.getByRole("button", { name: "Excluir tarefa" }));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("botão de fechar detalhes chama onClose", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Fechar detalhes" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("mostra aviso suave quando não há conteúdo cadastrado", () => {
    setup({ contentMd: "" });
    expect(
      screen.getByText(/Nenhum detalhe adicionado ainda/i),
    ).toBeInTheDocument();
  });
});
