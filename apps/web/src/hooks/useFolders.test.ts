import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFolders, useCreateFolder, useUpdateFolder, useDeleteFolder, FOLDERS_KEY } from "./useFolders";

const mockFetchFolders = vi.fn();
const mockCreateFolder = vi.fn();
const mockUpdateFolder = vi.fn();
const mockDeleteFolder = vi.fn();

vi.mock("@/api/resources", () => ({
  fetchFolders: (...args: unknown[]) => mockFetchFolders(...args),
  createFolder: (...args: unknown[]) => mockCreateFolder(...args),
  updateFolder: (...args: unknown[]) => mockUpdateFolder(...args),
  deleteFolder: (...args: unknown[]) => mockDeleteFolder(...args),
}));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  }
  return { qc, Wrapper };
}

describe("useFolders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("busca lista de pastas", async () => {
    mockFetchFolders.mockResolvedValue([]);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useFolders(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetchFolders).toHaveBeenCalledOnce();
  });
});

describe("useCreateFolder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cria pasta e invalida cache", async () => {
    mockCreateFolder.mockResolvedValue({ id: 1, name: "Nova" });
    const { qc, Wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useCreateFolder(), { wrapper: Wrapper });
    await result.current.mutateAsync({ name: "Nova" });
    expect(mockCreateFolder).toHaveBeenCalledWith({ name: "Nova" });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: FOLDERS_KEY });
  });
});

describe("useUpdateFolder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("atualiza pasta e invalida caches", async () => {
    mockUpdateFolder.mockResolvedValue({ id: 1, name: "Renomeada" });
    const { qc, Wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useUpdateFolder(), { wrapper: Wrapper });
    await result.current.mutateAsync({ id: 1, input: { name: "Renomeada" } });
    expect(mockUpdateFolder).toHaveBeenCalledWith(1, { name: "Renomeada" });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: FOLDERS_KEY });
  });
});

describe("useDeleteFolder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deleta pasta e invalida caches", async () => {
    mockDeleteFolder.mockResolvedValue(undefined);
    const { qc, Wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useDeleteFolder(), { wrapper: Wrapper });
    await result.current.mutateAsync(5);
    expect(mockDeleteFolder).toHaveBeenCalledWith(5);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: FOLDERS_KEY });
  });
});
