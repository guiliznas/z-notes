import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  useNotes,
  useNote,
  useCreateNote,
  useTrashNote,
  useHardDeleteNote,
  useRestoreNote,
} from "./useNotes";

const mockFetchNotes = vi.hoisted(() => vi.fn());
const mockFetchNote = vi.hoisted(() => vi.fn());
const mockCreateNote = vi.hoisted(() => vi.fn());
const mockTrashNote = vi.hoisted(() => vi.fn());
const mockHardDeleteNote = vi.hoisted(() => vi.fn());
const mockRestoreNote = vi.hoisted(() => vi.fn());

vi.mock("../api/resources", () => ({
  fetchNotes: mockFetchNotes,
  fetchNote: mockFetchNote,
  createNote: mockCreateNote,
  trashNote: mockTrashNote,
  hardDeleteNote: mockHardDeleteNote,
  restoreNote: mockRestoreNote,
}));

function createQcWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  }
  return { qc, Wrapper };
}

describe("useNotes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("busca notas ativas sem folder", async () => {
    mockFetchNotes.mockResolvedValue([]);
    const { Wrapper } = createQcWrapper();
    const { result } = renderHook(() => useNotes(null), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetchNotes).toHaveBeenCalledWith({ folderId: null, view: "active" });
  });

  it("busca notas de uma pasta com view archived", async () => {
    mockFetchNotes.mockResolvedValue([]);
    const { Wrapper } = createQcWrapper();
    const { result } = renderHook(() => useNotes(3, "archived"), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetchNotes).toHaveBeenCalledWith({ folderId: 3, view: "archived" });
  });
});

describe("useNote", () => {
  beforeEach(() => vi.clearAllMocks());

  it("busca nota por id", async () => {
    mockFetchNote.mockResolvedValue({ id: 5, contentMd: "teste" });
    const { Wrapper } = createQcWrapper();
    const { result } = renderHook(() => useNote(5), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetchNote).toHaveBeenCalledWith(5);
  });

  it("não executa quando id é null", async () => {
    const { Wrapper } = createQcWrapper();
    const { result } = renderHook(() => useNote(null), { wrapper: Wrapper });
    expect(result.current.isPending).toBe(true);
    expect(mockFetchNote).not.toHaveBeenCalled();
  });
});

describe("useCreateNote", () => {
  beforeEach(() => vi.clearAllMocks());

  it("cria nota e invalida cache", async () => {
    mockCreateNote.mockResolvedValue({ id: 1, contentMd: "Nova" });
    const { qc, Wrapper } = createQcWrapper();
    const spy = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useCreateNote(), { wrapper: Wrapper });
    await result.current.mutateAsync(1);
    expect(mockCreateNote).toHaveBeenCalledWith({ folderId: 1 });
    expect(spy).toHaveBeenCalledWith({ queryKey: expect.arrayContaining(["notes"]) });
  });
});

describe("useTrashNote", () => {
  beforeEach(() => vi.clearAllMocks());

  it("move nota para lixeira e invalida caches", async () => {
    mockTrashNote.mockResolvedValue(undefined);
    const { qc, Wrapper } = createQcWrapper();
    const spy = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useTrashNote(), { wrapper: Wrapper });
    await result.current.mutateAsync(3);
    expect(mockTrashNote).toHaveBeenCalledWith(3);
    expect(spy).toHaveBeenCalledWith({ queryKey: expect.arrayContaining(["notes"]) });
  });
});

describe("useHardDeleteNote", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deleta nota permanentemente", async () => {
    mockHardDeleteNote.mockResolvedValue(undefined);
    const { qc, Wrapper } = createQcWrapper();
    const spy = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useHardDeleteNote(), { wrapper: Wrapper });
    await result.current.mutateAsync(3);
    expect(mockHardDeleteNote).toHaveBeenCalledWith(3);
    expect(spy).toHaveBeenCalledWith({ queryKey: expect.arrayContaining(["notes"]) });
  });
});

describe("useRestoreNote", () => {
  beforeEach(() => vi.clearAllMocks());

  it("restaura nota e invalida caches", async () => {
    mockRestoreNote.mockResolvedValue({ id: 3, contentMd: "restaurada" });
    const { qc, Wrapper } = createQcWrapper();
    const spy = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useRestoreNote(), { wrapper: Wrapper });
    await result.current.mutateAsync(3);
    expect(mockRestoreNote).toHaveBeenCalledWith(3);
    expect(spy).toHaveBeenCalledWith({ queryKey: expect.arrayContaining(["notes"]) });
  });
});

describe("query keys", () => {
  it("useNotes gera chaves distintas por folderId e view", async () => {
    mockFetchNotes.mockResolvedValue([]);
    const { Wrapper: W1 } = createQcWrapper();
    const { Wrapper: W2 } = createQcWrapper();
    renderHook(() => useNotes(1, "active"), { wrapper: W1 });
    renderHook(() => useNotes(1, "trash"), { wrapper: W2 });
    expect(mockFetchNotes).toHaveBeenCalledTimes(2);
  });
});
