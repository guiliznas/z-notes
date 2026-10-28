import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const h = vi.hoisted(() => ({
  navigate: vi.fn(),
  notify: vi.fn(),
  archive: undefined as unknown,
  mut: {} as Record<string, ReturnType<typeof vi.fn>>,
}));

vi.mock("react-router-dom", () => ({ useNavigate: () => h.navigate }));
vi.mock("../ui/Toast", () => ({ useToast: () => ({ notify: h.notify }) }));
vi.mock("@/hooks/useTasks", () => {
  const m = (name: string) => {
    const mutate = vi.fn((_v: unknown, o?: { onSuccess?: () => void }) => o?.onSuccess?.());
    h.mut[name] = mutate;
    return () => ({ mutate });
  };
  return {
    useTaskArchive: () => ({ data: h.archive }),
    useUpdateTaskFolder: m("folder"),
    useUpdateTaskList: m("list"),
    useUpdateTask: m("task"),
  };
});

import { TaskArchiveView } from "./TaskArchiveView";

const full = {
  folders: [{ id: 1, name: "Estudos", listCount: 2 }],
  lists: [{ id: 2, name: "Ideias soltas", folderName: "Lançamento v2", taskCount: 4 }],
  tasks: [{ id: 3, title: "Ajustar o modo escuro", listName: "Revisar", folderName: "Lançamento v2" }],
};

describe("TaskArchiveView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.archive = full;
  });

  it("agrupa pastas, listas e tarefas, cada uma com sua origem", () => {
    render(<TaskArchiveView />);
    expect(screen.getByRole("heading", { name: "Pastas" })).toBeInTheDocument();
    expect(screen.getByText("2 lista(s)")).toBeInTheDocument();
    expect(screen.getByText("Lançamento v2 · 4 tarefa(s)")).toBeInTheDocument();
    expect(screen.getByText("Lançamento v2 › Revisar")).toBeInTheDocument();
  });

  it("Restaurar tarefa, lista e pasta chama a atualização certa", () => {
    render(<TaskArchiveView />);
    fireEvent.click(screen.getByRole("button", { name: "Restaurar Ajustar o modo escuro" }));
    expect(h.mut.task).toHaveBeenCalledWith({ id: 3, archived: false }, expect.anything());
    fireEvent.click(screen.getByRole("button", { name: "Restaurar Ideias soltas" }));
    expect(h.mut.list).toHaveBeenCalledWith({ id: 2, input: { archived: false } }, expect.anything());
    fireEvent.click(screen.getByRole("button", { name: "Restaurar Estudos" }));
    expect(h.mut.folder).toHaveBeenCalledWith({ id: 1, input: { archived: false } }, expect.anything());
    expect(h.navigate).toHaveBeenCalledWith("/tasks/folder/1");
  });

  it("vazio, carregando e voltar (celular)", () => {
    h.archive = { folders: [], lists: [], tasks: [] };
    const onBack = vi.fn();
    const { unmount } = render(<TaskArchiveView onBack={onBack} />);
    expect(screen.getByText("Nada arquivado.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(onBack).toHaveBeenCalledOnce();
    unmount();
    h.archive = undefined;
    render(<TaskArchiveView />);
    expect(screen.getByText("Carregando…")).toBeInTheDocument();
  });

  it("só mostra as seções que têm itens", () => {
    h.archive = { folders: [], lists: [], tasks: full.tasks };
    render(<TaskArchiveView />);
    expect(screen.queryByRole("heading", { name: "Pastas" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Listas" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Tarefas" })).toBeInTheDocument();
  });
});
