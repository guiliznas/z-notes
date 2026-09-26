import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFolders, useCreateFolder, useUpdateFolder, useDeleteFolder } from "./useFolders";

const mockFetchFolders = vi.hoisted(() => vi.fn());
const mockCreateFolder = vi.hoisted(() => vi.fn());
const mockUpdateFolder = vi.hoisted(() => vi.fn());
const mockDeleteFolder = vi.hoisted(() => vi.fn());

vi.mock("../api/resources", () => ({
  fetchFolders: mockFetchFolders,
  createFolder: mockCreateFolder,
  updateFolder: mockUpdateFolder,
  deleteFolder: mockDeleteFolder,
}));

function createQcWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  }
  return { qc, Wrapper };
}

describe("useFolders", () => {
  beforeEach(() => vi.clearAllMocks());

  it("busca pastas", async () => {
    mockFetchFolders.mockResolvedValue([]);
    const { Wrapper } = createQcWrapper();
    const { result } = renderHook(() => useFolders(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetchFolders).toHaveBeenCalled();
  });
});

describe("useCreateFolder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("cria pasta e invalida cache de folders", async () => {
    mockCreateFolder.mockResolvedValue({ id: 1, name: "x" });
    const { qc, Wrapper } = createQcWrapper();
    const spy = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useCreateFolder(), { wrapper: Wrapper });
    await result.current.mutateAsync({ name: "x" });
    expect(mockCreateFolder).toHaveBeenCalledWith({ name: "x" });
    expect(spy).toHaveBeenCalledWith({ queryKey: ["folders"] });
  });
});

describe("useUpdateFolder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("atualiza pasta e invalida folders e notes", async () => {
    mockUpdateFolder.mockResolvedValue({ id: 1, name: "y" });
    const { qc, Wrapper } = createQcWrapper();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useUpdateFolder(), { wrapper: Wrapper });
    await result.current.mutateAsync({ id: 1, input: { name: "y" } });
    expect(mockUpdateFolder).toHaveBeenCalledWith(1, { name: "y" });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["folders"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["notes"] });
  });
});

describe("useDeleteFolder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deleta pasta e invalida folders e notes", async () => {
    mockDeleteFolder.mockResolvedValue(undefined);
    const { qc, Wrapper } = createQcWrapper();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useDeleteFolder(), { wrapper: Wrapper });
    await result.current.mutateAsync(2);
    expect(mockDeleteFolder).toHaveBeenCalledWith(2);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["folders"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["notes"] });
  });
});

describe("FOLDERS_KEY", () => {
  it("exporta a chave constante", async () => {
    vi.resetModules();
    const mod = await import("./useFolders");
    expect(mod.FOLDERS_KEY).toEqual(["folders"]);
  });
});
