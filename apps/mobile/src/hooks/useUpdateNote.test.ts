import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUpdateNote } from "./useUpdateNote";

const mockUpdateNoteApi = vi.hoisted(() => vi.fn());

vi.mock("../api/resources", () => ({
  updateNote: mockUpdateNoteApi,
}));

describe("useUpdateNote", () => {
  beforeEach(() => vi.clearAllMocks());

  it("atualiza nota e invalida cache", async () => {
    mockUpdateNoteApi.mockResolvedValue({ id: 1, contentMd: "editado" });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");
    function Wrapper({ children }: { children: React.ReactNode }) {
      return React.createElement(QueryClientProvider, { client: qc }, children);
    }
    const { result } = renderHook(() => useUpdateNote(), { wrapper: Wrapper });
    await result.current.mutateAsync({ id: 1, contentMd: "editado", version: 1 });
    expect(mockUpdateNoteApi).toHaveBeenCalledWith(1, { id: 1, contentMd: "editado", version: 1 });
    expect(invalidateSpy).toHaveBeenCalled();
  });

  it("atualiza nota setando query data da nota", async () => {
    const updated = { id: 2, contentMd: "novo" };
    mockUpdateNoteApi.mockResolvedValue(updated);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const setDataSpy = vi.spyOn(qc, "setQueryData");
    function Wrapper({ children }: { children: React.ReactNode }) {
      return React.createElement(QueryClientProvider, { client: qc }, children);
    }
    const { result } = renderHook(() => useUpdateNote(), { wrapper: Wrapper });
    await result.current.mutateAsync({ id: 2, contentMd: "novo", version: 0 });
    expect(setDataSpy).toHaveBeenCalledWith(["note", 2], updated);
  });
});
