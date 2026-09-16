import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useSearch } from "./useSearch";

const mockSearchNotes = vi.hoisted(() => vi.fn());

vi.mock("../api/resources", () => ({
  searchNotes: mockSearchNotes,
}));

function createQcWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  }
  return { qc, Wrapper };
}

describe("useSearch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("não executa busca quando query é vazia", () => {
    const { Wrapper } = createQcWrapper();
    const { result } = renderHook(() => useSearch("   "), { wrapper: Wrapper });
    expect(result.current.isPending).toBe(true);
    expect(mockSearchNotes).not.toHaveBeenCalled();
  });

  it("chama searchNotes com a query trimada e folderId", async () => {
    const hits = [
      {
        note: { id: 1, title: "Nota de Teste", excerpt: "Conteúdo", folderId: 2 },
        snippet: "Nota de <b>Teste</b>",
      },
    ];
    mockSearchNotes.mockResolvedValue(hits);
    const { Wrapper } = createQcWrapper();
    const { result } = renderHook(() => useSearch(" Teste ", 2), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSearchNotes).toHaveBeenCalledWith("Teste", 2);
    expect(result.current.data).toEqual(hits);
  });
});
