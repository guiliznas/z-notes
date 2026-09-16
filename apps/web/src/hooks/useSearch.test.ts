import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSearch } from "./useSearch";

const mockSearchNotes = vi.hoisted(() => vi.fn());

vi.mock("@/api/resources", () => ({
  searchNotes: mockSearchNotes,
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, {
    client: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  }, children);
}

describe("useSearch", () => {
  beforeEach(() => {
    mockSearchNotes.mockClear();
  });

  it("não busca com query vazia", () => {
    const { result } = renderHook(() => useSearch("", null), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("não busca com query só de espaços", () => {
    const { result } = renderHook(() => useSearch("   ", null), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("habilita busca com query não-vazia", async () => {
    mockSearchNotes.mockResolvedValue([]);
    const { result } = renderHook(() => useSearch("teste", null), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSearchNotes).toHaveBeenCalledWith("teste", null);
  });
});
