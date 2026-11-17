import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import type { Task, TaskBoard as Board } from "@z-notes/shared";

const h = vi.hoisted(() => ({
  navigate: vi.fn(),
  notify: vi.fn(),
  bp: "desktop" as "desktop" | "mobile",
  board: undefined as unknown,
  boardError: null as unknown,
  archiveCompletedIds: [4, 5] as number[],
  mutations: {} as Record<string, ReturnType<typeof vi.fn>>,
}));

vi.mock("react-router-dom", () => ({ useNavigate: () => h.navigate }));
vi.mock("@/hooks/useBreakpoint", () => ({ useBreakpoint: () => h.bp }));
vi.mock("../ui/Toast", () => ({ useToast: () => ({ notify: h.notify }) }));

vi.mock("@/hooks/useTasks", () => {
  const m = (name: string, onSuccessArg?: () => unknown) => {
    const mutate = vi.fn((vars: unknown, opts?: { onSuccess?: (r: unknown) => void }) => {
      opts?.onSuccess?.(onSuccessArg ? onSuccessArg() : undefined);
      return vars;
    });
    h.mutations[name] = mutate;
    return () => ({ mutate });
  };
  return {
    useTaskBoard: () => ({ data: h.board, isError: !!h.boardError, error: h.boardError }),
    useCreateTaskList: m("createList", () => ({ id: 77 })),
    useUpdateTaskList: m("updateList"),
    useDeleteTaskList: m("deleteList"),
    useUpdateTaskFolder: m("updateFolder"),
    useDeleteTaskFolder: m("deleteFolder"),
    useCreateTask: m("createTask"),
    useUpdateTask: m("updateTask"),
    useDeleteTask: m("deleteTask"),
    useArchiveCompleted: m("archiveCompleted", () => ({ ids: h.archiveCompletedIds })),
    useSetTasksArchived: m("setArchived"),
  };
});

import { TaskBoard } from "./TaskBoard";

let nid = 0;
const task = (listId: number, title: string, over: Partial<Task> = {}): Task => ({
  id: ++nid, listId, title, priority: "none", position: nid,
  done: false, doneAt: null, archived: false, createdAt: 0, updatedAt: 0, ...over,
});

function makeBoard(): Board {
  nid = 0;
  const l = (id: number, name: string, tasks: Task[]) => ({
    id, folderId: 1, name, position: id, archived: false, createdAt: 0, updatedAt: 0, tasks,
  });
  return {
    folder: { id: 1, name: "Lançamento v2", position: 1, archived: false, createdAt: 0, updatedAt: 0 },
    lists: [
      l(10, "A fazer", [task(10, "Deep link"), task(10, "Backup NAS"), task(10, "Feita 1", { done: true, doneAt: 1 }), task(10, "Feita 2", { done: true, doneAt: 2 })]),
      l(20, "Em andamento", [task(20, "Protótipo")]),
    ],
  };
}

describe("TaskBoard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.bp = "desktop";
    h.board = makeBoard();
    h.boardError = null;
    h.archiveCompletedIds = [4, 5];
  });

  it("mostra a pasta, o resumo e uma coluna por lista", () => {
    render(<TaskBoard folderId={1} />);
    expect(screen.getByRole("heading", { name: "Lançamento v2" })).toBeInTheDocument();
    expect(screen.getByText(/2 listas · 3 tarefas abertas/)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Lista A fazer" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Lista Em andamento" })).toBeInTheDocument();
  });

  it("carregando e erro 404 têm telas próprias", () => {
    h.board = undefined;
    const { unmount } = render(<TaskBoard folderId={1} />);
    expect(screen.getByText("Carregando…")).toBeInTheDocument();
    unmount();
    h.boardError = Object.assign(new Error("x"), { status: 404 });
    render(<TaskBoard folderId={1} />);
    expect(screen.getByRole("button", { name: "Voltar" })).toBeInTheDocument();
  });

  it("Nova lista abre o diálogo e cria na pasta atual", () => {
    render(<TaskBoard folderId={1} />);
    fireEvent.click(screen.getAllByRole("button", { name: /Nova lista/ })[0]);
    fireEvent.change(screen.getByPlaceholderText("Ex.: A fazer"), { target: { value: "Revisar" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar" }));
    expect(h.mutations.createList).toHaveBeenCalledWith({ folderId: 1, name: "Revisar" }, expect.anything());
  });

  it("adicionar tarefa cria na lista da coluna", () => {
    render(<TaskBoard folderId={1} />);
    const column = screen.getByRole("region", { name: "Lista Em andamento" });
    fireEvent.click(within(column).getByRole("button", { name: "Adicionar tarefa" }));
    const input = screen.getByLabelText("Título da nova tarefa");
    fireEvent.change(input, { target: { value: "Nova" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(h.mutations.createTask).toHaveBeenCalledWith({ listId: 20, title: "Nova" }, expect.anything());
  });

  it("concluir uma tarefa envia done:true", () => {
    render(<TaskBoard folderId={1} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /Concluir tarefa: Protótipo/ }));
    expect(h.mutations.updateTask).toHaveBeenCalledWith({ id: 5, done: true }, expect.anything());
  });

  describe("Arquivar concluídas", () => {
    it("arquiva a lista e avisa com Desfazer, que restaura exatamente os mesmos ids", () => {
      render(<TaskBoard folderId={1} />);
      fireEvent.click(screen.getByRole("button", { name: "Arquivar concluídas" }));
      expect(h.mutations.archiveCompleted).toHaveBeenCalledWith(10, expect.anything());

      const [message, kind, options] = h.notify.mock.calls[0];
      expect(message).toBe("2 tarefas arquivadas.");
      expect(kind).toBe("info");
      expect(options.action.label).toBe("Desfazer");
      options.action.onClick();
      expect(h.mutations.setArchived).toHaveBeenCalledWith({ ids: [4, 5], archived: false });
    });

    it("no singular fala '1 tarefa arquivada.' e sem ids não avisa nada", () => {
      h.archiveCompletedIds = [4];
      const { unmount } = render(<TaskBoard folderId={1} />);
      fireEvent.click(screen.getByRole("button", { name: "Arquivar concluídas" }));
      expect(h.notify.mock.calls[0][0]).toBe("1 tarefa arquivada.");
      unmount();
      h.notify.mockClear();
      h.archiveCompletedIds = [];
      render(<TaskBoard folderId={1} />);
      fireEvent.click(screen.getByRole("button", { name: "Arquivar concluídas" }));
      expect(h.notify).not.toHaveBeenCalled();
    });
  });

  it("arquivar uma tarefa avisa com Desfazer que devolve à posição original", () => {
    render(<TaskBoard folderId={1} />);
    fireEvent.click(screen.getByRole("button", { name: "Ações da tarefa: Deep link" }));
    fireEvent.click(screen.getByRole("button", { name: "Arquivar tarefa" }));
    expect(h.mutations.updateTask).toHaveBeenCalledWith({ id: 1, archived: true }, expect.anything());
    const options = h.notify.mock.calls[0][2];
    options.action.onClick();
    expect(h.mutations.setArchived).toHaveBeenCalledWith({ ids: [1], archived: false });
  });

  it("Mover para… lista as colunas e move a tarefa", () => {
    render(<TaskBoard folderId={1} />);
    fireEvent.click(screen.getByRole("button", { name: "Ações da tarefa: Deep link" }));
    fireEvent.click(screen.getByRole("button", { name: "Mover para…" }));
    expect(screen.getByRole("button", { name: /A fazer.*atual/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Em andamento" }));
    expect(h.mutations.updateTask).toHaveBeenCalledWith({ id: 1, listId: 20 }, expect.anything());
  });

  it("excluir tarefa pede confirmação", () => {
    render(<TaskBoard folderId={1} />);
    fireEvent.click(screen.getByRole("button", { name: "Ações da tarefa: Deep link" }));
    fireEvent.click(screen.getByRole("button", { name: "Excluir tarefa" }));
    expect(h.mutations.deleteTask).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    expect(h.mutations.deleteTask).toHaveBeenCalledWith(1, expect.anything());
  });

  describe("excluir lista", () => {
    const open = () => {
      fireEvent.click(screen.getByRole("button", { name: "Ações da lista A fazer" }));
      fireEvent.click(screen.getByRole("button", { name: "Excluir lista" }));
    };

    it("oferece Arquivar em vez disso, com a contagem de tarefas que seriam apagadas", () => {
      render(<TaskBoard folderId={1} />);
      open();
      expect(screen.getByText(/As 4 tarefas da lista serão apagadas/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Arquivar em vez disso" }));
      expect(h.mutations.updateList).toHaveBeenCalledWith({ id: 10, input: { archived: true } }, expect.anything());
      expect(h.mutations.deleteList).not.toHaveBeenCalled();
    });

    it("Excluir apaga de vez", () => {
      render(<TaskBoard folderId={1} />);
      open();
      fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
      expect(h.mutations.deleteList).toHaveBeenCalledWith(10, expect.anything());
    });
  });

  it("arquivar a pasta volta para a lista de pastas e oferece Desfazer", () => {
    render(<TaskBoard folderId={1} />);
    fireEvent.click(screen.getByRole("button", { name: "Ações da pasta" }));
    fireEvent.click(screen.getByRole("button", { name: "Arquivar pasta" }));
    expect(h.mutations.updateFolder).toHaveBeenCalledWith({ id: 1, input: { archived: true } }, expect.anything());
    expect(h.navigate).toHaveBeenCalledWith("/tasks");
    h.notify.mock.calls[0][2].action.onClick();
    expect(h.mutations.updateFolder).toHaveBeenCalledWith({ id: 1, input: { archived: false } });
  });

  it("pasta sem listas mostra a tela vazia com o botão Criar lista", () => {
    h.board = { ...makeBoard(), lists: [] };
    render(<TaskBoard folderId={1} />);
    expect(screen.getByText("Nenhuma lista ainda")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Criar lista" }));
    expect(screen.getByPlaceholderText("Ex.: A fazer")).toBeInTheDocument();
  });

  describe("celular", () => {
    beforeEach(() => {
      h.bp = "mobile";
    });

    it("mostra uma lista por vez, em abas, e troca ao tocar", () => {
      render(<TaskBoard folderId={1} onBack={() => {}} />);
      expect(screen.getByRole("tab", { name: /A fazer/ })).toHaveAttribute("aria-selected", "true");
      expect(screen.getByRole("region", { name: "Lista A fazer" })).toBeInTheDocument();
      expect(screen.queryByRole("region", { name: "Lista Em andamento" })).toBeNull();
      fireEvent.click(screen.getByRole("tab", { name: /Em andamento/ }));
      expect(screen.getByRole("region", { name: "Lista Em andamento" })).toBeInTheDocument();
      expect(screen.queryByRole("region", { name: "Lista A fazer" })).toBeNull();
    });

    it("tem botão voltar para as pastas", () => {
      const onBack = vi.fn();
      render(<TaskBoard folderId={1} onBack={onBack} />);
      fireEvent.click(screen.getByRole("button", { name: "Voltar para as pastas" }));
      expect(onBack).toHaveBeenCalledOnce();
    });
  });
});
