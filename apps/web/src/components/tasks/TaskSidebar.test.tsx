import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const h = vi.hoisted(() => ({
  navigate: vi.fn(),
  notify: vi.fn(),
  selection: { kind: "none" } as { kind: string; folderId?: number },
  folders: [] as unknown[],
  archive: undefined as unknown,
  mut: {} as Record<string, ReturnType<typeof vi.fn>>,
}));

vi.mock("react-router-dom", () => ({ useNavigate: () => h.navigate }));
vi.mock("@/hooks/useTaskSelection", async (orig) => ({
  ...(await orig<typeof import("@/hooks/useTaskSelection")>()),
  useTaskSelection: () => h.selection,
}));
vi.mock("../ui/Toast", () => ({ useToast: () => ({ notify: h.notify }) }));
vi.mock("../SidebarFooter", () => ({ SidebarFooter: () => null }));
vi.mock("@/hooks/useTasks", () => {
  const m = (name: string, result?: unknown) => {
    const mutate = vi.fn((_v: unknown, o?: { onSuccess?: (r: unknown) => void }) => o?.onSuccess?.(result));
    h.mut[name] = mutate;
    return () => ({ mutate });
  };
  return {
    useTaskFolders: () => ({ data: h.folders }),
    useTaskArchive: () => ({ data: h.archive }),
    useCreateTaskFolder: m("create", { id: 42 }),
    useUpdateTaskFolder: m("update"),
    useDeleteTaskFolder: m("remove"),
  };
});

import { TaskSidebar } from "./TaskSidebar";

const folder = (id: number, name: string, openCount: number) => ({
  id, name, openCount, position: id, archived: false, createdAt: 0, updatedAt: 0,
});

describe("TaskSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.selection = { kind: "none" };
    h.folders = [folder(1, "Lançamento v2", 9), folder(2, "Casa", 4)];
    h.archive = { folders: [], lists: [{}], tasks: [{}, {}] };
  });

  it("tem a alternância de seção com Tarefas ativa e leva às Notas", () => {
    render(<TaskSidebar />);
    expect(screen.getByRole("button", { name: "Tarefas" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Notas" }));
    expect(h.navigate).toHaveBeenCalledWith("/");
  });

  it("lista as pastas com a contagem de abertas e abre o quadro ao clicar", () => {
    render(<TaskSidebar />);
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Casa" }));
    expect(h.navigate).toHaveBeenCalledWith("/tasks/folder/2");
  });

  it("Arquivadas mostra o total de itens e abre a visão", () => {
    render(<TaskSidebar />);
    expect(screen.getByText("3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Arquivadas/ }));
    expect(h.navigate).toHaveBeenCalledWith("/tasks/archived");
  });

  it("sem pastas mostra a dica", () => {
    h.folders = [];
    render(<TaskSidebar />);
    expect(screen.getByText("Nenhuma pasta de tarefas ainda.")).toBeInTheDocument();
  });

  it("Nova pasta cria e já navega para ela", () => {
    render(<TaskSidebar />);
    fireEvent.click(screen.getByRole("button", { name: "Nova pasta de tarefas" }));
    fireEvent.change(screen.getByPlaceholderText("Ex.: Lançamento v2"), { target: { value: "Estudos" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar" }));
    expect(h.mut.create).toHaveBeenCalledWith({ name: "Estudos" }, expect.anything());
    expect(h.navigate).toHaveBeenCalledWith("/tasks/folder/42");
  });

  it("arquivar a pasta aberta sai dela e oferece Desfazer", () => {
    h.selection = { kind: "folder", folderId: 1 };
    render(<TaskSidebar />);
    fireEvent.click(screen.getByRole("button", { name: "Ações da pasta Lançamento v2" }));
    fireEvent.click(screen.getByRole("button", { name: "Arquivar" }));
    expect(h.mut.update).toHaveBeenCalledWith({ id: 1, input: { archived: true } }, expect.anything());
    expect(h.navigate).toHaveBeenCalledWith("/tasks");
    h.notify.mock.calls[0][2].action.onClick();
    expect(h.mut.update).toHaveBeenCalledWith({ id: 1, input: { archived: false } });
  });

  it("excluir exige confirmação", () => {
    render(<TaskSidebar />);
    fireEvent.click(screen.getByRole("button", { name: "Ações da pasta Casa" }));
    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    expect(h.mut.remove).not.toHaveBeenCalled();
    expect(screen.getByText(/serão apagadas para sempre/)).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Excluir" }).at(-1)!);
    expect(h.mut.remove).toHaveBeenCalledWith(2, expect.anything());
  });

  it("não aninha botão dentro de botão", () => {
    const { container } = render(<TaskSidebar />);
    expect(container.querySelector("button button")).toBeNull();
  });
});
