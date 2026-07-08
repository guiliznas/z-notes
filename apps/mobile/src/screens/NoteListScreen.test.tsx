import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useNotes } from "../hooks/useNotes";
import NoteListScreen from "./NoteListScreen";

vi.mock("../hooks/useNotes");

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    React.createElement(QueryClientProvider, { client: qc }, ui),
  );
}

describe("NoteListScreen", () => {
  beforeEach(() => vi.clearAllMocks());

  it("mostra Carregando enquanto pending", () => {
    vi.mocked(useNotes).mockReturnValue({ isPending: true, data: undefined } as any);
    const { getByText } = renderWithProviders(
      React.createElement(NoteListScreen, {
        folderId: null,
        onSelectNote: () => {},
        onCreateNote: () => {},
      }),
    );
    expect(getByText("Carregando...")).toBeTruthy();
  });

  it("mostra Nenhuma nota quando lista vazia", async () => {
    vi.mocked(useNotes).mockReturnValue({ isPending: false, data: [] } as any);
    const { getByText } = renderWithProviders(
      React.createElement(NoteListScreen, {
        folderId: null,
        onSelectNote: () => {},
        onCreateNote: () => {},
      }),
    );
    expect(getByText("Nenhuma nota")).toBeTruthy();
  });

  it("renderiza notas com título e excerpt", async () => {
    const notes = [
      { id: 1, title: "Nota 1", excerpt: "Conteúdo 1" },
      { id: 2, title: "Nota 2", excerpt: "Conteúdo 2" },
    ];
    vi.mocked(useNotes).mockReturnValue({ isPending: false, data: notes } as any);
    const { getByText } = renderWithProviders(
      React.createElement(NoteListScreen, {
        folderId: null,
        onSelectNote: () => {},
        onCreateNote: () => {},
      }),
    );
    expect(getByText("Nota 1")).toBeTruthy();
    expect(getByText("Nota 2")).toBeTruthy();
    expect(getByText("Conteúdo 1")).toBeTruthy();
  });

  it("mostra nome da pasta quando folderId não é null", () => {
    vi.mocked(useNotes).mockReturnValue({ isPending: false, data: [] } as any);
    const { getByText } = renderWithProviders(
      React.createElement(NoteListScreen, {
        folderId: 3,
        onSelectNote: () => {},
        onCreateNote: () => {},
      }),
    );
    expect(getByText("Pasta 3")).toBeTruthy();
  });
});
