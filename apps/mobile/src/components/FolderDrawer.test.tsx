import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import FolderDrawer from "./FolderDrawer";
import * as useFoldersModule from "../hooks/useFolders";

vi.mock("../hooks/useFolders");

const mockFolders = [
  {
    id: 1,
    name: "Pessoal",
    parentId: null,
    position: 0,
    noteCount: 3,
    createdAt: 1000,
    updatedAt: 1000,
    children: [
      {
        id: 2,
        name: "Finanças",
        parentId: 1,
        position: 0,
        noteCount: 1,
        createdAt: 1000,
        updatedAt: 1000,
      },
    ],
  },
];

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    React.createElement(QueryClientProvider, { client: qc }, ui),
  );
}

describe("FolderDrawer", () => {
  const mockCreate = { mutate: vi.fn() };
  const mockUpdate = { mutate: vi.fn() };
  const mockDelete = { mutate: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(useFoldersModule, "useFolders").mockReturnValue({
      data: mockFolders,
      isPending: false,
    } as any);
    vi.spyOn(useFoldersModule, "useCreateFolder").mockReturnValue(mockCreate as any);
    vi.spyOn(useFoldersModule, "useUpdateFolder").mockReturnValue(mockUpdate as any);
    vi.spyOn(useFoldersModule, "useDeleteFolder").mockReturnValue(mockDelete as any);
  });

  it("renderiza vistas de sistema", () => {
    const onSelectView = vi.fn();
    const onClose = vi.fn();

    const { getByText } = renderWithProviders(
      React.createElement(FolderDrawer, {
        visible: true,
        onClose,
        selectedFolderId: null,
        selectedView: "active",
        onSelectView,
        onSelectFolder: () => {},
      }),
    );

    expect(getByText("Todas as notas")).toBeTruthy();
    expect(getByText("Arquivadas")).toBeTruthy();
    expect(getByText("Lixeira")).toBeTruthy();

    fireEvent.click(getByText("Arquivadas"));
    expect(onSelectView).toHaveBeenCalledWith("archived");
    expect(onClose).toHaveBeenCalled();
  });

  it("renderiza pastas raiz e subpastas com contadores", () => {
    const onSelectFolder = vi.fn();
    const onClose = vi.fn();

    const { getByText } = renderWithProviders(
      React.createElement(FolderDrawer, {
        visible: true,
        onClose,
        selectedFolderId: null,
        selectedView: "active",
        onSelectView: () => {},
        onSelectFolder,
      }),
    );

    expect(getByText("Pessoal")).toBeTruthy();
    expect(getByText("3")).toBeTruthy();
    expect(getByText("Finanças")).toBeTruthy();
    expect(getByText("1")).toBeTruthy();

    fireEvent.click(getByText("Pessoal"));
    expect(onSelectFolder).toHaveBeenCalledWith(1, "Pessoal");
    expect(onClose).toHaveBeenCalled();
  });

  it("permite abrir modal para criar nova pasta", () => {
    const { getByText, getByPlaceholderText } = renderWithProviders(
      React.createElement(FolderDrawer, {
        visible: true,
        onClose: () => {},
        selectedFolderId: null,
        selectedView: "active",
        onSelectView: () => {},
        onSelectFolder: () => {},
      }),
    );

    fireEvent.click(getByText("+ Nova"));
    expect(getByPlaceholderText("Nome da pasta")).toBeTruthy();

    fireEvent.change(getByPlaceholderText("Nome da pasta"), {
      target: { value: "Trabalho" },
    });
    fireEvent.click(getByText("Salvar"));

    expect(mockCreate.mutate).toHaveBeenCalledWith({ name: "Trabalho" });
  });

  it("permite criar subpasta a partir de pasta raiz", () => {
    const { getByLabelText, getByText, getByPlaceholderText } = renderWithProviders(
      React.createElement(FolderDrawer, {
        visible: true,
        onClose: () => {},
        selectedFolderId: null,
        selectedView: "active",
        onSelectView: () => {},
        onSelectFolder: () => {},
      }),
    );

    fireEvent.click(getByLabelText("Adicionar subpasta em Pessoal"));
    expect(getByText('Nova Subpasta em "Pessoal"')).toBeTruthy();

    fireEvent.change(getByPlaceholderText("Nome da pasta"), {
      target: { value: "Projetos" },
    });
    fireEvent.click(getByText("Salvar"));

    expect(mockCreate.mutate).toHaveBeenCalledWith({ name: "Projetos", parentId: 1 });
  });
});
