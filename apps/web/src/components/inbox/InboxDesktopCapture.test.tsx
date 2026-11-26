import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import type { InboxItem } from "@z-notes/shared";
import { InboxPage } from "./InboxPage";
import { App } from "@/App";
import { useAuth } from "@/auth/AuthContext";
import {
  savePendingCapture,
  getPendingCapture,
  clearPendingCapture,
  dispatchCaptureEvent,
} from "@/lib/deepLink";

const mockCreateMutate = vi.hoisted(() => vi.fn());

vi.mock("@/auth/AuthContext", () => ({
  useAuth: vi.fn(),
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

vi.mock("@/components/NotesPage", () => ({
  NotesPage: () => <div>Página de Notas</div>,
}));

vi.mock("@/components/tasks/TasksPage", () => ({
  TasksPage: () => <div>Página de Tarefas</div>,
}));

vi.mock("@/hooks/useInbox", () => ({
  useInbox: () => ({
    items: [] as InboxItem[],
    hasNextPage: false,
    fetchNextPage: vi.fn(),
    isFetchingNextPage: false,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useInboxCount: () => ({ data: { count: 0 } }),
  useCreateInboxItem: () => ({
    mutate: mockCreateMutate,
    isPending: false,
    failedItems: new Map(),
    retryFailed: vi.fn(),
  }),
  useArchiveInboxItem: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteInboxItem: () => ({ mutate: vi.fn(), isPending: false }),
  useConvertInboxToTask: () => ({ mutate: vi.fn(), isPending: false }),
  useConvertInboxToNote: () => ({ mutate: vi.fn(), isPending: false }),
  useBatchArchiveInbox: () => ({ mutate: vi.fn(), isPending: false }),
  useBatchDeleteInbox: () => ({ mutate: vi.fn(), isPending: false }),
  useBatchConvertToTask: () => ({ mutate: vi.fn(), isPending: false }),
}));

const AUTHENTICATED_USER = {
  id: 1,
  email: "david@example.com",
  name: "David",
  avatarUrl: null,
  isAdmin: false,
};

describe("Captura rápida no desktop via deep link (znotes://capture)", () => {
  beforeEach(() => {
    localStorage.clear();
    mockCreateMutate.mockClear();
    vi.mocked(useAuth).mockReturnValue({
      status: "authenticated",
      user: AUTHENTICATED_USER,
      refresh: vi.fn(),
      logout: vi.fn(),
      deleteAccount: vi.fn(),
    });
  });

  it("ao abrir /inbox com parâmetros de captura e texto, pré-preenche sem gravar sozinho", async () => {
    render(
      <MemoryRouter initialEntries={["/inbox?capture=1&text=Lembrar%20de%20revisar%20PR"]}>
        <Routes>
          <Route path="/inbox" element={<InboxPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const textarea = screen.getByLabelText("Mensagem do Inbox") as HTMLTextAreaElement;
    expect(textarea.value).toBe("Lembrar de revisar PR");
    // Não deve gravar automaticamente ao abrir
    expect(mockCreateMutate).not.toHaveBeenCalled();
  });

  it("ao enviar mensagem pré-preenchida por captura rápida desktop, registra com source: 'desktop'", async () => {
    render(
      <MemoryRouter initialEntries={["/inbox?capture=1&text=Nota%20do%20desktop"]}>
        <Routes>
          <Route path="/inbox" element={<InboxPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const sendButton = screen.getByLabelText("Enviar mensagem");
    fireEvent.click(sendButton);

    expect(mockCreateMutate).toHaveBeenCalledTimes(1);
    const sentPayload = mockCreateMutate.mock.calls[0][0];
    expect(sentPayload.content).toBe("Nota do desktop");
    expect(sentPayload.source).toBe("desktop");
  });

  it("disparo de evento de captura com app aberto atualiza texto, limpa pendingCapture e foca o composer", async () => {
    render(
      <MemoryRouter initialEntries={["/inbox"]}>
        <Routes>
          <Route path="/inbox" element={<InboxPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const textarea = screen.getByLabelText("Mensagem do Inbox") as HTMLTextAreaElement;
    expect(textarea.value).toBe("");

    savePendingCapture("Texto disparado via atalho global");
    act(() => {
      dispatchCaptureEvent({ text: "Texto disparado via atalho global" });
    });

    expect(textarea.value).toBe("Texto disparado via atalho global");
    expect(getPendingCapture()).toBeNull();
  });

  it("captura desktop sem ?text= ainda registra source: 'desktop' ao enviar (query param, pendingCapture e evento)", async () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={["/inbox?capture=1"]}>
        <Routes>
          <Route path="/inbox" element={<InboxPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const textarea1 = screen.getByLabelText("Mensagem do Inbox") as HTMLTextAreaElement;
    fireEvent.change(textarea1, { target: { value: "Digitado apos atalho query" } });
    fireEvent.click(screen.getByLabelText("Enviar mensagem"));

    expect(mockCreateMutate).toHaveBeenCalledTimes(1);
    expect(mockCreateMutate.mock.calls[0][0].source).toBe("desktop");
    unmount();

    mockCreateMutate.mockClear();
    savePendingCapture(undefined);
    const { unmount: unmount2 } = render(
      <MemoryRouter initialEntries={["/inbox"]}>
        <Routes>
          <Route path="/inbox" element={<InboxPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const textarea2 = screen.getByLabelText("Mensagem do Inbox") as HTMLTextAreaElement;
    fireEvent.change(textarea2, { target: { value: "Digitado apos pendingCapture vazio" } });
    fireEvent.click(screen.getByLabelText("Enviar mensagem"));

    expect(mockCreateMutate).toHaveBeenCalledTimes(1);
    expect(mockCreateMutate.mock.calls[0][0].source).toBe("desktop");
    expect(getPendingCapture()).toBeNull();
    unmount2();

    mockCreateMutate.mockClear();
    render(
      <MemoryRouter initialEntries={["/inbox"]}>
        <Routes>
          <Route path="/inbox" element={<InboxPage />} />
        </Routes>
      </MemoryRouter>,
    );

    savePendingCapture(undefined);
    act(() => {
      dispatchCaptureEvent({});
    });
    expect(getPendingCapture()).toBeNull();

    const textarea3 = screen.getByLabelText("Mensagem do Inbox") as HTMLTextAreaElement;
    fireEvent.change(textarea3, { target: { value: "Digitado apos evento vazio" } });
    fireEvent.click(screen.getByLabelText("Enviar mensagem"));

    expect(mockCreateMutate).toHaveBeenCalledTimes(1);
    expect(mockCreateMutate.mock.calls[0][0].source).toBe("desktop");
  });

  it("restaura captura rápida pendente do localStorage e limpa a chave após uso", async () => {
    savePendingCapture("Ideia salva antes da tela carregar");

    render(
      <MemoryRouter initialEntries={["/inbox"]}>
        <Routes>
          <Route path="/inbox" element={<InboxPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const textarea = screen.getByLabelText("Mensagem do Inbox") as HTMLTextAreaElement;
    expect(textarea.value).toBe("Ideia salva antes da tela carregar");
    expect(getPendingCapture()).toBeNull();
  });

  it("usuário deslogado: exibe aviso de captura pendente no LoginPage e reage a novo evento ao vivo", async () => {
    vi.mocked(useAuth).mockReturnValue({
      status: "unauthenticated",
      user: null,
      refresh: vi.fn(),
      logout: vi.fn(),
      deleteAccount: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.queryByTestId("pending-capture-alert")).not.toBeInTheDocument();

    act(() => {
      savePendingCapture("Nota pendente de autenticação");
      dispatchCaptureEvent({ text: "Nota pendente de autenticação" });
    });

    const alert = screen.getByTestId("pending-capture-alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent("Captura rápida pendente");
    expect(alert).toHaveTextContent("Nota pendente de autenticação");
  });
});
