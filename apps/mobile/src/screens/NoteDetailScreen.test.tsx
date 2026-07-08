import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useNote } from "../hooks/useNotes";
import { useUpdateNote } from "../hooks/useUpdateNote";
import NoteDetailScreen from "./NoteDetailScreen";

vi.mock("../hooks/useNotes");
vi.mock("../hooks/useUpdateNote");

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    React.createElement(QueryClientProvider, { client: qc }, ui),
  );
}

describe("NoteDetailScreen", () => {
  beforeEach(() => vi.clearAllMocks());

  it("mostra Carregando enquanto pending", () => {
    vi.mocked(useNote).mockReturnValue({ isPending: true, data: undefined } as any);
    vi.mocked(useUpdateNote).mockReturnValue({ mutate: vi.fn() } as any);
    const { getByText } = renderWithProviders(
      React.createElement(NoteDetailScreen, { noteId: 1, onBack: () => {} }),
    );
    expect(getByText("Carregando...")).toBeTruthy();
  });

  it("mostra mensagem quando nota não encontrada", () => {
    vi.mocked(useNote).mockReturnValue({ isPending: false, data: undefined } as any);
    vi.mocked(useUpdateNote).mockReturnValue({ mutate: vi.fn() } as any);
    const { getByText } = renderWithProviders(
      React.createElement(NoteDetailScreen, { noteId: 1, onBack: () => {} }),
    );
    expect(getByText("Nota não encontrada")).toBeTruthy();
  });

  it("renderiza conteúdo da nota em modo leitura", () => {
    vi.mocked(useNote).mockReturnValue({
      isPending: false,
      data: { id: 1, contentMd: "Olá mundo", version: 1 },
    } as any);
    vi.mocked(useUpdateNote).mockReturnValue({ mutate: vi.fn() } as any);
    const { getAllByText, container } = renderWithProviders(
      React.createElement(NoteDetailScreen, { noteId: 1, onBack: () => {} }),
    );
    expect(getAllByText("Olá mundo").length).toBeGreaterThanOrEqual(1);
    expect(container.querySelectorAll("button").length).toBeGreaterThanOrEqual(2);
  });

  it("entra em modo edição ao tocar em editar", () => {
    vi.mocked(useNote).mockReturnValue({
      isPending: false,
      data: { id: 1, contentMd: "Texto", version: 1 },
    } as any);
    vi.mocked(useUpdateNote).mockReturnValue({ mutate: vi.fn() } as any);
    const { container } = renderWithProviders(
      React.createElement(NoteDetailScreen, { noteId: 1, onBack: () => {} }),
    );
    const buttons = container.querySelectorAll("button");
    const editBtn = buttons[buttons.length - 1];
    fireEvent.click(editBtn);
    expect(container.querySelector("input")).toBeTruthy();
  });

  it("chama mutate ao salvar edição", () => {
    const mutate = vi.fn();
    vi.mocked(useNote).mockReturnValue({
      isPending: false,
      data: { id: 1, contentMd: "Original", version: 1 },
    } as any);
    vi.mocked(useUpdateNote).mockReturnValue({ mutate } as any);
    const { container } = renderWithProviders(
      React.createElement(NoteDetailScreen, { noteId: 1, onBack: () => {} }),
    );
    const buttons = Array.from(container.querySelectorAll("button"));
    const editBtn = buttons[buttons.length - 1] as HTMLButtonElement;
    fireEvent.click(editBtn);
    const afterEditButtons = Array.from(container.querySelectorAll("button"));
    const saveBtn = afterEditButtons[afterEditButtons.length - 1] as HTMLButtonElement;
    fireEvent.click(saveBtn);
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith(
      { id: 1, contentMd: "Original", version: 1 },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });
});
