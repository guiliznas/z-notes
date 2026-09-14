import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import NoteActionModal from "./NoteActionModal";
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

describe("NoteActionModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(useFoldersModule, "useFolders").mockReturnValue({
      data: mockFolders,
      isPending: false,
    } as any);
  });

  it("renderiza opções para nota ativa", () => {
    const onToggleArchive = vi.fn();
    const onTrash = vi.fn();
    const onClose = vi.fn();

    const { getByText } = renderWithProviders(
      React.createElement(NoteActionModal, {
        visible: true,
        isArchived: false,
        isDeleted: false,
        currentFolderId: 1,
        onClose,
        onToggleArchive,
        onMoveToFolder: () => {},
        onTrash,
      }),
    );

    expect(getByText("Mover para pasta...")).toBeTruthy();
    expect(getByText("Arquivar nota")).toBeTruthy();
    expect(getByText("Mover para lixeira")).toBeTruthy();

    fireEvent.click(getByText("Arquivar nota"));
    expect(onToggleArchive).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("mostra Desarquivar quando nota está arquivada", () => {
    const { getByText } = renderWithProviders(
      React.createElement(NoteActionModal, {
        visible: true,
        isArchived: true,
        isDeleted: false,
        currentFolderId: 1,
        onClose: () => {},
        onToggleArchive: () => {},
        onMoveToFolder: () => {},
        onTrash: () => {},
      }),
    );

    expect(getByText("Desarquivar nota")).toBeTruthy();
  });

  it("renderiza opções de lixeira quando nota está deletada", () => {
    const onRestore = vi.fn();
    const onHardDelete = vi.fn();

    const { getByText } = renderWithProviders(
      React.createElement(NoteActionModal, {
        visible: true,
        isArchived: false,
        isDeleted: true,
        currentFolderId: null,
        onClose: () => {},
        onToggleArchive: () => {},
        onMoveToFolder: () => {},
        onTrash: () => {},
        onRestore,
        onHardDelete,
      }),
    );

    expect(getByText("Restaurar nota")).toBeTruthy();
    expect(getByText("Excluir definitivamente")).toBeTruthy();

    fireEvent.click(getByText("Restaurar nota"));
    expect(onRestore).toHaveBeenCalled();
  });

  it("permite selecionar pasta para mover", () => {
    const onMoveToFolder = vi.fn();

    const { getByText } = renderWithProviders(
      React.createElement(NoteActionModal, {
        visible: true,
        isArchived: false,
        isDeleted: false,
        currentFolderId: 1,
        onClose: () => {},
        onToggleArchive: () => {},
        onMoveToFolder,
        onTrash: () => {},
      }),
    );

    fireEvent.click(getByText("Mover para pasta..."));
    expect(getByText("Mover para Pasta")).toBeTruthy();
    expect(getByText("Finanças")).toBeTruthy();

    fireEvent.click(getByText("Finanças"));
    expect(onMoveToFolder).toHaveBeenCalledWith(2);
  });
});
