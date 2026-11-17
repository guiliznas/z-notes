import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { InboxItem } from "@z-notes/shared";
import { InboxPage } from "./InboxPage";

const mockNavigate = vi.hoisted(() => vi.fn());
const mockItems = vi.hoisted(() => ({
  list: [] as InboxItem[],
  hasNextPage: false,
  fetchNextPage: vi.fn(),
  isFetchingNextPage: false,
  isLoading: false,
  isError: false,
  error: null as Error | null,
}));

const mockCreateMutate = vi.hoisted(() => vi.fn());
const mockFailedItems = vi.hoisted(() => new Map());

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

vi.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ user: { id: 1, name: "David" }, logout: vi.fn() }),
}));

vi.mock("@/hooks/useBreakpoint", () => ({
  useBreakpoint: () => "desktop",
}));

vi.mock("@/hooks/useOnline", () => ({
  useOnline: () => true,
  usePendingSaves: () => 0,
}));

vi.mock("@/components/SidebarFooter", () => ({
  SidebarFooter: () => null,
}));

vi.mock("@/hooks/useInbox", () => ({
  useInbox: () => ({
    items: mockItems.list,
    hasNextPage: mockItems.hasNextPage,
    fetchNextPage: mockItems.fetchNextPage,
    isFetchingNextPage: mockItems.isFetchingNextPage,
    isLoading: mockItems.isLoading,
    isError: mockItems.isError,
    error: mockItems.error,
    refetch: vi.fn(),
  }),
  useInboxCount: () => ({ data: { count: mockItems.list.length } }),
  useCreateInboxItem: () => ({
    mutate: mockCreateMutate,
    failedItems: mockFailedItems,
    retryFailed: vi.fn(),
  }),
  useArchiveInboxItem: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useDeleteInboxItem: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useConvertInboxToTask: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useConvertInboxToNote: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useBatchArchiveInbox: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useBatchDeleteInbox: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useBatchConvertToTask: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

function makeItem(id: number, content: string, capturedAt: number, clientId = `client-${id}`): InboxItem {
  return {
    id,
    clientId,
    content,
    source: "app",
    capturedAt,
    archived: false,
    archivedAt: null,
    resolvedKind: null,
    resolvedId: null,
    createdAt: capturedAt,
    updatedAt: capturedAt,
  };
}

describe("InboxPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockItems.list = [];
    mockItems.hasNextPage = false;
    mockItems.isLoading = false;
    mockItems.isError = false;
    mockItems.error = null;
    mockFailedItems.clear();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("renderiza o estado vazio 'Inbox zero' quando não há mensagens", () => {
    render(<InboxPage />);
    expect(screen.getByText("Inbox zero")).toBeInTheDocument();
    expect(screen.getByText(/Nenhuma mensagem pendente/)).toBeInTheDocument();
    expect(screen.getByLabelText("Mensagem do Inbox")).toBeInTheDocument();
  });

  it("renderiza mensagens com horário, separador de dia e links clicáveis", () => {
    const today = new Date().getTime();
    mockItems.list = [
      makeItem(1, "Mensagem simples", today - 10000),
      makeItem(2, "Confira o link https://ziltro.dev para mais info", today),
    ];

    render(<InboxPage />);
    expect(screen.getByText("Hoje")).toBeInTheDocument();
    expect(screen.getByText("Mensagem simples")).toBeInTheDocument();
    expect(screen.getByText(/Confira o link/)).toBeInTheDocument();

    const link = screen.getByRole("link", { name: "https://ziltro.dev" });
    expect(link).toHaveAttribute("href", "https://ziltro.dev");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("envia mensagem ao pressionar Enter no composer (desktop)", () => {
    render(<InboxPage />);
    const textarea = screen.getByLabelText("Mensagem do Inbox");

    fireEvent.change(textarea, { target: { value: "Minha nota rápida" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    expect(mockCreateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "Minha nota rápida",
        source: "app",
      }),
    );
  });

  it("Shift+Enter não envia e permite quebra de linha", () => {
    render(<InboxPage />);
    const textarea = screen.getByLabelText("Mensagem do Inbox");

    fireEvent.change(textarea, { target: { value: "Primeira linha" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });

    expect(mockCreateMutate).not.toHaveBeenCalled();
  });

  it("exibe indicador 'enviando…' para mensagem otimista com id negativo", () => {
    const now = Date.now();
    mockItems.list = [makeItem(-now, "Captura em andamento", now, "client-optimistic")];

    render(<InboxPage />);
    expect(screen.getByText("Captura em andamento")).toBeInTheDocument();
    expect(screen.getByText(/enviando…/)).toBeInTheDocument();
  });

  it("exibe mensagem com falha e opções de Tentar de novo e Copiar texto", () => {
    const now = Date.now();
    const item = makeItem(99, "Texto com erro", now, "fail-1");
    mockItems.list = [item];
    mockFailedItems.set("fail-1", {
      clientId: "fail-1",
      vars: { clientId: "fail-1", content: "Texto com erro" },
      error: "Erro 400",
    });

    render(<InboxPage />);
    expect(screen.getByText("Falha ao enviar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copiar texto" })).toBeInTheDocument();
  });

  it("exibe botão de carregar mensagens anteriores e dispara paginação", () => {
    mockItems.list = [makeItem(1, "Item", Date.now())];
    mockItems.hasNextPage = true;

    render(<InboxPage />);
    const button = screen.getByRole("button", { name: "Carregar mensagens anteriores" });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(mockItems.fetchNextPage).toHaveBeenCalled();
  });

  it("tem região acessível com aria-live=polite", () => {
    render(<InboxPage />);
    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
  });
});
