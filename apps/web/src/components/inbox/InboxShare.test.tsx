import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import type { InboxItem } from "@z-notes/shared";
import { InboxPage } from "./InboxPage";
import { App } from "@/App";
import { useAuth } from "@/auth/AuthContext";
import {
  savePendingShare,
  getPendingShare,
  clearPendingShare,
  PENDING_SHARE_KEY,
} from "@/lib/shareTarget";

const mockNavigate = vi.hoisted(() => vi.fn());
const mockCreateMutate = vi.hoisted(() => vi.fn());

vi.mock("@/auth/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/useBreakpoint", () => ({
  useBreakpoint: () => "desktop",
}));

let isOnlineValue = true;
vi.mock("@/hooks/useOnline", () => ({
  useOnline: () => isOnlineValue,
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

describe("Web Share Target - Integração /inbox/share e fluxo de compartilhamento", () => {
  beforeEach(() => {
    localStorage.clear();
    isOnlineValue = true;
    mockCreateMutate.mockClear();
    mockNavigate.mockClear();
    vi.mocked(useAuth).mockReturnValue({
      status: "authenticated",
      user: AUTHENTICATED_USER,
      refresh: vi.fn(),
      logout: vi.fn(),
    });
  });

  it("pré-preenche o composer na rota /inbox/share sem gravar automaticamente", async () => {
    render(
      <MemoryRouter
        initialEntries={[
          "/inbox/share?title=Artigo%20Interessante&url=https%3A%2F%2Fexample.com%2Fpost",
        ]}
      >
        <Routes>
          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/inbox/share" element={<InboxPage />} />
        </Routes>
      </MemoryRouter>
    );

    const textarea = screen.getByLabelText("Mensagem do Inbox") as HTMLTextAreaElement;

    // Deve pré-preencher com título e URL normalizados
    expect(textarea.value).toBe("Artigo Interessante\nhttps://example.com/post");

    // NÃO deve gravar sozinho no carregamento (efeito colateral proibido por GET)
    expect(mockCreateMutate).not.toHaveBeenCalled();
  });

  it("ao enviar o texto pré-preenchido pelo compartilhamento, registra com source: 'share'", async () => {
    render(
      <MemoryRouter
        initialEntries={[
          "/inbox/share?title=Vite%20Doc&url=https%3A%2F%2Fvite.dev",
        ]}
      >
        <Routes>
          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/inbox/share" element={<InboxPage />} />
        </Routes>
      </MemoryRouter>
    );

    const sendButton = screen.getByLabelText("Enviar mensagem");
    fireEvent.click(sendButton);

    expect(mockCreateMutate).toHaveBeenCalledTimes(1);
    const sentPayload = mockCreateMutate.mock.calls[0][0];
    expect(sentPayload.content).toBe("Vite Doc\nhttps://vite.dev");
    expect(sentPayload.source).toBe("share");
  });

  it("compartilhamento de vídeo do YouTube normaliza sem duplicar link", async () => {
    render(
      <MemoryRouter
        initialEntries={[
          "/inbox/share?title=TypeScript%20Course&text=https%3A%2F%2Fyoutu.be%2F123&url=https%3A%2F%2Fyoutu.be%2F123",
        ]}
      >
        <Routes>
          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/inbox/share" element={<InboxPage />} />
        </Routes>
      </MemoryRouter>
    );

    const textarea = screen.getByLabelText("Mensagem do Inbox") as HTMLTextAreaElement;
    expect(textarea.value).toBe("TypeScript Course\nhttps://youtu.be/123");
  });

  it("restaura compartilhamento pendente do localStorage e limpa a chave após uso", async () => {
    savePendingShare("Texto salvo antes da autenticação");

    render(
      <MemoryRouter initialEntries={["/inbox"]}>
        <Routes>
          <Route path="/inbox" element={<InboxPage />} />
        </Routes>
      </MemoryRouter>
    );

    const textarea = screen.getByLabelText("Mensagem do Inbox") as HTMLTextAreaElement;
    expect(textarea.value).toBe("Texto salvo antes da autenticação");

    // A chave no localStorage deve ter sido consumida e limpa
    expect(getPendingShare()).toBeNull();
  });

  it("fluxo deslogado: preserva o compartilhamento no localStorage e exibe aviso no LoginPage", async () => {
    vi.mocked(useAuth).mockReturnValue({
      status: "unauthenticated",
      user: null,
      refresh: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter
        initialEntries={[
          "/inbox/share?title=Receita&text=Bolo%20de%20Cenoura&url=https%3A%2F%2Fculinaria.com",
        ]}
      >
        <App />
      </MemoryRouter>
    );

    // O alerta deve estar visível na página de login
    const alert = screen.getByTestId("pending-share-alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent("Conteúdo compartilhado recebido");
    expect(alert).toHaveTextContent("Receita");

    // Deve estar persistido no localStorage
    const saved = getPendingShare();
    expect(saved).not.toBeNull();
    expect(saved?.content).toContain("Receita");
    expect(saved?.content).toContain("Bolo de Cenoura");
    expect(saved?.content).toContain("https://culinaria.com");
  });

  it("captura offline: permite enviar mensagem pré-preenchida mesmo sem rede", async () => {
    isOnlineValue = false; // Simula dispositivo offline

    render(
      <MemoryRouter
        initialEntries={[
          "/inbox/share?text=Ideia%20offline%20compartilhada",
        ]}
      >
        <Routes>
          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/inbox/share" element={<InboxPage />} />
        </Routes>
      </MemoryRouter>
    );

    const textarea = screen.getByLabelText("Mensagem do Inbox") as HTMLTextAreaElement;
    expect(textarea.value).toBe("Ideia offline compartilhada");

    const sendButton = screen.getByLabelText("Enviar mensagem");
    fireEvent.click(sendButton);

    expect(mockCreateMutate).toHaveBeenCalledTimes(1);
    const sentPayload = mockCreateMutate.mock.calls[0][0];
    expect(sentPayload.content).toBe("Ideia offline compartilhada");
    expect(sentPayload.source).toBe("share");
  });

  it("visita a /inbox/share sem parâmetros não trava e deixa o composer vazio", async () => {
    render(
      <MemoryRouter initialEntries={["/inbox/share"]}>
        <Routes>
          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/inbox/share" element={<InboxPage />} />
        </Routes>
      </MemoryRouter>
    );

    const textarea = screen.getByLabelText("Mensagem do Inbox") as HTMLTextAreaElement;
    expect(textarea.value).toBe("");
    expect(mockCreateMutate).not.toHaveBeenCalled();
  });
});
