import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { InboxItem, TaskFolderWithCount } from "@z-notes/shared";
import { InboxChatView } from "./InboxChatView";
import { ToastProvider } from "@/components/ui/Toast";

const mockNavigate = vi.hoisted(() => vi.fn());
const mockArchiveMutate = vi.hoisted(() => vi.fn());
const mockDeleteMutate = vi.hoisted(() => vi.fn());
const mockConvertTaskMutate = vi.hoisted(() => vi.fn());
const mockConvertNoteMutate = vi.hoisted(() => vi.fn());
const mockBatchArchiveMutate = vi.hoisted(() => vi.fn());
const mockBatchDeleteMutate = vi.hoisted(() => vi.fn());
const mockBatchConvertTaskMutate = vi.hoisted(() => vi.fn());

const mockItemsData = vi.hoisted(() => ({
  list: [] as InboxItem[],
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: "/inbox", search: "" }),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));

vi.mock("@/hooks/useInbox", () => ({
  useInbox: () => ({
    items: mockItemsData.list,
    hasNextPage: false,
    fetchNextPage: vi.fn(),
    isFetchingNextPage: false,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useCreateInboxItem: () => ({
    mutate: vi.fn(),
    failedItems: new Map(),
    retryFailed: vi.fn(),
  }),
  useArchiveInboxItem: () => ({
    mutate: mockArchiveMutate,
    isPending: false,
  }),
  useDeleteInboxItem: () => ({
    mutate: mockDeleteMutate,
    isPending: false,
  }),
  useConvertInboxToTask: () => ({
    mutate: mockConvertTaskMutate,
    isPending: false,
  }),
  useConvertInboxToNote: () => ({
    mutate: mockConvertNoteMutate,
    isPending: false,
  }),
  useBatchArchiveInbox: () => ({
    mutate: mockBatchArchiveMutate,
    isPending: false,
  }),
  useBatchDeleteInbox: () => ({
    mutate: mockBatchDeleteMutate,
    isPending: false,
  }),
  useBatchConvertToTask: () => ({
    mutate: mockBatchConvertTaskMutate,
    isPending: false,
  }),
}));

vi.mock("@/hooks/useTasks", () => ({
  useTaskFolders: () => ({
    data: [
      { id: 1, name: "Projeto Principal", position: 0, archived: false, openCount: 2, createdAt: 0, updatedAt: 0 },
    ] as TaskFolderWithCount[],
    isLoading: false,
  }),
  useTaskBoard: () => ({
    data: {
      folder: { id: 1, name: "Projeto Principal", position: 0, archived: false, createdAt: 0, updatedAt: 0 },
      lists: [
        { id: 10, folderId: 1, name: "A Fazer", position: 0, archived: false, tasks: [], createdAt: 0, updatedAt: 0 },
        { id: 20, folderId: 1, name: "Em Andamento", position: 1, archived: false, tasks: [], createdAt: 0, updatedAt: 0 },
      ],
    },
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useFolders", () => ({
  useFolders: () => ({
    data: [
      { id: 100, name: "Ideias", parentId: null, position: 0, children: [] },
      { id: 200, name: "Trabalho", parentId: null, position: 1, children: [] },
    ],
    isLoading: false,
  }),
}));

function makeItem(
  id: number,
  content: string,
  options: Partial<InboxItem> = {},
): InboxItem {
  return {
    id,
    clientId: `client-${id}`,
    content,
    source: "app",
    capturedAt: 1700000000000 + id * 1000,
    archived: false,
    archivedAt: null,
    resolvedKind: null,
    resolvedId: null,
    createdAt: 1700000000000 + id * 1000,
    updatedAt: 1700000000000 + id * 1000,
    ...options,
  };
}

function renderWithToast(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe("Inbox Triage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("abre menu de ações ⋯ e lista Virar tarefa, Virar nota, Arquivar e Excluir", async () => {
    mockItemsData.list = [makeItem(1, "Comprar café")];
    renderWithToast(<InboxChatView currentFilter="pending" />);

    const menuBtn = screen.getByLabelText("Ações da mensagem");
    fireEvent.click(menuBtn);

    expect(screen.getByRole("menuitem", { name: /Virar tarefa/i })).toBeDefined();
    expect(screen.getByRole("menuitem", { name: /Virar nota/i })).toBeDefined();
    expect(screen.getByRole("menuitem", { name: /Arquivar/i })).toBeDefined();
    expect(screen.getByRole("menuitem", { name: /Excluir/i })).toBeDefined();
  });

  it("arquiva mensagem via menu de ações e dispara toast", async () => {
    mockItemsData.list = [makeItem(1, "Mensagem para arquivar")];
    renderWithToast(<InboxChatView currentFilter="pending" />);

    const menuBtn = screen.getByLabelText("Ações da mensagem");
    fireEvent.click(menuBtn);

    const archiveBtn = screen.getByRole("menuitem", { name: /Arquivar/i });
    fireEvent.click(archiveBtn);

    expect(mockArchiveMutate).toHaveBeenCalledWith(
      { id: 1, archived: true },
      expect.anything(),
    );
  });

  it("abre modal Virar tarefa, permite escolher coluna/lista e confirma conversão", async () => {
    mockItemsData.list = [makeItem(1, "Mensagem para virar tarefa")];
    renderWithToast(<InboxChatView currentFilter="pending" />);

    const menuBtn = screen.getByLabelText("Ações da mensagem");
    fireEvent.click(menuBtn);

    const toTaskBtn = screen.getByRole("menuitem", { name: /Virar tarefa/i });
    fireEvent.click(toTaskBtn);

    // Modal deve estar aberto
    expect(screen.getByRole("heading", { name: "Virar tarefa" })).toBeDefined();
    expect(screen.getByText("A Fazer")).toBeDefined();
    expect(screen.getByText("Em Andamento")).toBeDefined();

    // Seleciona coluna "Em Andamento"
    fireEvent.click(screen.getByText("Em Andamento"));

    // Clica em confirmar
    const submitBtn = screen.getByRole("button", { name: "Virar tarefa" });
    fireEvent.click(submitBtn);

    expect(mockConvertTaskMutate).toHaveBeenCalledWith(
      { id: 1, listId: 20 },
      expect.anything(),
    );
  });

  it("abre modal Virar nota, permite escolher pasta e confirma", async () => {
    mockItemsData.list = [makeItem(1, "Primeira linha como título\nSegunda linha")];
    renderWithToast(<InboxChatView currentFilter="pending" />);

    const menuBtn = screen.getByLabelText("Ações da mensagem");
    fireEvent.click(menuBtn);

    const toNoteBtn = screen.getByRole("menuitem", { name: /Virar nota/i });
    fireEvent.click(toNoteBtn);

    expect(screen.getByRole("heading", { name: "Virar nota" })).toBeDefined();
    expect(screen.getByText("Ideias")).toBeDefined();
    expect(screen.getByText("Trabalho")).toBeDefined();

    // Seleciona pasta "Trabalho"
    fireEvent.click(screen.getByText("Trabalho"));

    const submitBtn = screen.getByRole("button", { name: "Virar nota" });
    fireEvent.click(submitBtn);

    expect(mockConvertNoteMutate).toHaveBeenCalledWith(
      { id: 1, folderId: 200 },
      expect.anything(),
    );
  });

  it("excluir mensagem abre diálogo de confirmação antes de chamar DELETE", async () => {
    mockItemsData.list = [makeItem(1, "Mensagem para excluir")];
    renderWithToast(<InboxChatView currentFilter="pending" />);

    const menuBtn = screen.getByLabelText("Ações da mensagem");
    fireEvent.click(menuBtn);

    const deleteBtn = screen.getByRole("menuitem", { name: /Excluir/i });
    fireEvent.click(deleteBtn);

    expect(screen.getByRole("heading", { name: "Excluir mensagem" })).toBeDefined();
    expect(screen.getByText(/excluir esta mensagem do Inbox permanentemente/i)).toBeDefined();

    // Clica em Excluir no diálogo
    const confirmBtn = screen.getByRole("button", { name: "Excluir" });
    fireEvent.click(confirmBtn);

    expect(mockDeleteMutate).toHaveBeenCalledWith(1, expect.anything());
  });

  it("exibe badge clicável 'Virou tarefa ›' para mensagem resolvida como tarefa", async () => {
    mockItemsData.list = [
      makeItem(1, "Estudo de caso", { resolvedKind: "task", resolvedId: 42 }),
    ];
    renderWithToast(<InboxChatView currentFilter="resolved" />);

    const badge = screen.getByRole("button", { name: /Virou tarefa ›/i });
    expect(badge).toBeDefined();

    fireEvent.click(badge);
    expect(mockNavigate).toHaveBeenCalledWith("/tasks");
  });

  it("exibe badge clicável 'Virou nota ›' para mensagem resolvida como nota", async () => {
    mockItemsData.list = [
      makeItem(2, "Ideia de post", { resolvedKind: "note", resolvedId: 99 }),
    ];
    renderWithToast(<InboxChatView currentFilter="resolved" />);

    const badge = screen.getByRole("button", { name: /Virou nota ›/i });
    expect(badge).toBeDefined();

    fireEvent.click(badge);
    expect(mockNavigate).toHaveBeenCalledWith("/all/note/99");
  });

  it("seleção em lote: permite selecionar mensagens e arquivar em lote", async () => {
    mockItemsData.list = [
      makeItem(1, "Msg 1"),
      makeItem(2, "Msg 2"),
      makeItem(3, "Msg 3"),
    ];
    renderWithToast(<InboxChatView currentFilter="pending" />);

    // Clica em "Selecionar" no cabeçalho
    const selectBtn = screen.getByRole("button", { name: /Selecionar em lote/i });
    fireEvent.click(selectBtn);

    // Marca checkboxes
    const cb1 = screen.getByLabelText(/Selecionar mensagem "Msg 1"/i);
    const cb2 = screen.getByLabelText(/Selecionar mensagem "Msg 2"/i);
    fireEvent.click(cb1);
    fireEvent.click(cb2);

    expect(screen.getAllByText("2 selecionadas").length).toBeGreaterThanOrEqual(1);

    // Barra flutuante exibe ações em lote
    const batchArchiveBtn = screen.getByRole("button", { name: /Arquivar \(2\)/i });
    fireEvent.click(batchArchiveBtn);

    expect(mockBatchArchiveMutate).toHaveBeenCalledWith(
      { ids: [1, 2], archived: true },
      expect.anything(),
    );
  });

  it("seleção em lote: botão 'Selecionar todas' marca todos os itens", async () => {
    mockItemsData.list = [
      makeItem(1, "Msg 1"),
      makeItem(2, "Msg 2"),
    ];
    renderWithToast(<InboxChatView currentFilter="pending" />);

    const selectBtn = screen.getByRole("button", { name: /Selecionar em lote/i });
    fireEvent.click(selectBtn);

    const selectAllBtn = screen.getByRole("button", { name: "Selecionar todas" });
    fireEvent.click(selectAllBtn);

    expect(screen.getAllByText("2 selecionadas").length).toBeGreaterThanOrEqual(1);
  });

  it("gestos de deslizar (swipe): deslizar para a direita dispara virar tarefa", async () => {
    mockItemsData.list = [makeItem(1, "Msg para swipe direita")];
    renderWithToast(<InboxChatView currentFilter="pending" />);

    const bubble = screen.getByText("Msg para swipe direita").closest("div[tabindex]")!;

    // Touch start
    fireEvent.touchStart(bubble, {
      touches: [{ clientX: 50, clientY: 100 }],
    });

    // Touch move para a direita (> 60px)
    fireEvent.touchMove(bubble, {
      touches: [{ clientX: 130, clientY: 100 }],
    });

    // Touch end
    fireEvent.touchEnd(bubble);

    // Deve abrir o modal de virar tarefa
    expect(screen.getByRole("heading", { name: "Virar tarefa" })).toBeDefined();
  });

  it("gestos de deslizar (swipe): deslizar para a esquerda dispara arquivar", async () => {
    mockItemsData.list = [makeItem(1, "Msg para swipe esquerda")];
    renderWithToast(<InboxChatView currentFilter="pending" />);

    const bubble = screen.getByText("Msg para swipe esquerda").closest("div[tabindex]")!;

    // Touch start
    fireEvent.touchStart(bubble, {
      touches: [{ clientX: 150, clientY: 100 }],
    });

    // Touch move para a esquerda (< -60px)
    fireEvent.touchMove(bubble, {
      touches: [{ clientX: 70, clientY: 100 }],
    });

    // Touch end
    fireEvent.touchEnd(bubble);

    expect(mockArchiveMutate).toHaveBeenCalledWith(
      { id: 1, archived: true },
      expect.anything(),
    );
  });

  it("atalhos de teclado na bolha focada: 't' abre virar tarefa e 'a' arquiva", async () => {
    mockItemsData.list = [makeItem(1, "Msg com atalho")];
    renderWithToast(<InboxChatView currentFilter="pending" />);

    const bubble = screen.getByText("Msg com atalho").closest("div[tabindex]")!;

    // Pressiona 'a'
    fireEvent.keyDown(bubble, { key: "a" });
    expect(mockArchiveMutate).toHaveBeenCalledWith(
      { id: 1, archived: true },
      expect.anything(),
    );

    // Pressiona 't'
    fireEvent.keyDown(bubble, { key: "t" });
    expect(screen.getByRole("heading", { name: "Virar tarefa" })).toBeDefined();
  });
});
