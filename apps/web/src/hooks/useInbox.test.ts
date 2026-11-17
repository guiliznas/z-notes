import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider, onlineManager } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { InboxItem } from "@z-notes/shared";
import {
  useInbox,
  useInboxCount,
  useCreateInboxItem,
  inboxListKey,
  INBOX_COUNT_KEY,
} from "./useInbox";
import { CREATE_INBOX_ITEM_KEY } from "@/offline/queryClient";

const mockFetchInbox = vi.hoisted(() => vi.fn());
const mockFetchInboxCount = vi.hoisted(() => vi.fn());
const mockCreateInboxItem = vi.hoisted(() => vi.fn());

vi.mock("@/api/resources", () => ({
  fetchInbox: mockFetchInbox,
  fetchInboxCount: mockFetchInboxCount,
  createInboxItem: mockCreateInboxItem,
  updateInboxItem: vi.fn(),
  deleteInboxItem: vi.fn(),
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

function createQcWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  // Registra defaults para o teste
  qc.setMutationDefaults(CREATE_INBOX_ITEM_KEY, {
    mutationFn: mockCreateInboxItem,
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  }
  return { qc, Wrapper };
}

describe("useInbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onlineManager.setOnline(true);
  });

  it("busca mensagens e ordena em ordem cronológica ascendente (mais antigas em cima, mais novas embaixo)", async () => {
    // API retorna desc (mais recente primeiro)
    const recent = makeItem(2, "recente", 2000);
    const older = makeItem(1, "antiga", 1000);
    mockFetchInbox.mockResolvedValue([recent, older]);

    const { Wrapper } = createQcWrapper();
    const { result } = renderHook(() => useInbox("pending"), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.items).toEqual([older, recent]);
  });

  it("useInboxCount busca a contagem de pendentes", async () => {
    mockFetchInboxCount.mockResolvedValue({ count: 5 });
    const { Wrapper } = createQcWrapper();
    const { result } = renderHook(() => useInboxCount(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.count).toBe(5);
  });
});

describe("useCreateInboxItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onlineManager.setOnline(true);
  });

  it("envia mensagem online e substitui o item otimista", async () => {
    const { qc, Wrapper } = createQcWrapper();
    const existing = makeItem(1, "existente", 1000);
    qc.setQueryData(inboxListKey("pending"), {
      pages: [[existing]],
      pageParams: [undefined],
    });
    qc.setQueryData(INBOX_COUNT_KEY, { count: 1 });

    const serverItem = makeItem(2, "nova mensagem", 2000, "client-uuid-1");
    mockCreateInboxItem.mockResolvedValue(serverItem);

    const { result } = renderHook(() => useCreateInboxItem(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        clientId: "client-uuid-1",
        content: "nova mensagem",
        capturedAt: 2000,
      });
    });

    expect(mockCreateInboxItem).toHaveBeenCalledWith({
      clientId: "client-uuid-1",
      content: "nova mensagem",
      capturedAt: 2000,
    });

    const cached = qc.getQueryData<{ pages: InboxItem[][] }>(inboxListKey("pending"));
    expect(cached?.pages[0]).toContainEqual(serverItem);
  });

  it("atualização otimista insere o item imediatamente com clientId", async () => {
    const { qc, Wrapper } = createQcWrapper();
    qc.setQueryData(inboxListKey("pending"), {
      pages: [[]],
      pageParams: [undefined],
    });

    let resolvePromise: (item: InboxItem) => void;
    mockCreateInboxItem.mockReturnValue(
      new Promise<InboxItem>((resolve) => {
        resolvePromise = resolve;
      }),
    );

    const { result } = renderHook(() => useCreateInboxItem(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({
        clientId: "client-opt-1",
        content: "mensagem otimista",
        capturedAt: 3000,
      });
    });

    // Logo após onMutate rodar, o item já deve existir no cache com id negativo
    await waitFor(() => {
      const cached = qc.getQueryData<{ pages: InboxItem[][] }>(inboxListKey("pending"));
      expect(cached?.pages[0][0]).toMatchObject({
        clientId: "client-opt-1",
        content: "mensagem otimista",
        capturedAt: 3000,
      });
      expect(cached?.pages[0][0].id).toBeLessThan(0);
    });

    // Conclui a resposta do servidor
    await act(async () => {
      resolvePromise!(makeItem(42, "mensagem otimista", 3000, "client-opt-1"));
    });

    await waitFor(() => {
      const cachedAfter = qc.getQueryData<{ pages: InboxItem[][] }>(inboxListKey("pending"));
      expect(cachedAfter?.pages[0][0].id).toBe(42);
    });
  });

  it("reenvio com mesmo clientId não duplica mensagens", async () => {
    const { qc, Wrapper } = createQcWrapper();
    const existing = makeItem(10, "já gravada", 1500, "client-same-id");
    qc.setQueryData(inboxListKey("pending"), {
      pages: [[existing]],
      pageParams: [undefined],
    });

    mockCreateInboxItem.mockResolvedValue(existing);

    const { result } = renderHook(() => useCreateInboxItem(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        clientId: "client-same-id",
        content: "já gravada",
        capturedAt: 1500,
      });
    });

    const cached = qc.getQueryData<{ pages: InboxItem[][] }>(inboxListKey("pending"));
    const matching = cached?.pages[0].filter((i) => i.clientId === "client-same-id");
    expect(matching).toHaveLength(1);
  });

  it("falha 400 registra mensagem em failedItems sem descartar em silêncio", async () => {
    const { Wrapper } = createQcWrapper();
    mockCreateInboxItem.mockRejectedValue(new Error("Conteúdo inválido"));

    const { result } = renderHook(() => useCreateInboxItem(), { wrapper: Wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({
          clientId: "client-fail-1",
          content: "mensagem com erro",
          capturedAt: 4000,
        });
      } catch {
        // esperado
      }
    });

    expect(result.current.failedItems.has("client-fail-1")).toBe(true);
    const failed = result.current.failedItems.get("client-fail-1");
    expect(failed?.vars.content).toBe("mensagem com erro");
    expect(failed?.error).toContain("Conteúdo inválido");
  });

  it("pausa mutação quando offline e retoma ao reconectar", async () => {
    onlineManager.setOnline(false);

    const { qc, Wrapper } = createQcWrapper();
    mockCreateInboxItem.mockResolvedValue(makeItem(99, "offline", 5000, "client-offline"));

    const { result } = renderHook(() => useCreateInboxItem(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({
        clientId: "client-offline",
        content: "offline",
        capturedAt: 5000,
      });
    });

    // Quando offline, mock não é chamado ainda porque a mutação fica pausada
    expect(mockCreateInboxItem).not.toHaveBeenCalled();

    // Reconecta a rede
    await act(async () => {
      onlineManager.setOnline(true);
      await qc.resumePausedMutations();
    });

    expect(mockCreateInboxItem).toHaveBeenCalledWith({
      clientId: "client-offline",
      content: "offline",
      capturedAt: 5000,
    });
  });
});
