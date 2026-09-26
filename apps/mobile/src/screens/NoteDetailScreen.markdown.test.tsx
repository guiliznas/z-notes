import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useNote } from "../hooks/useNotes";
import { useUpdateNote } from "../hooks/useUpdateNote";
import NoteDetailScreen from "./NoteDetailScreen";

vi.mock("../hooks/useNotes");
vi.mock("../hooks/useUpdateNote");

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(React.createElement(QueryClientProvider, { client: qc }, ui));
}

describe("NoteDetailScreen markdown", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renderiza markdown no modo leitura (default)", () => {
    vi.mocked(useNote).mockReturnValue({
      isPending: false,
      data: { id: 1, contentMd: "- [ ] tarefa markdown", version: 1 },
    } as any);
    vi.mocked(useUpdateNote).mockReturnValue({ mutate: vi.fn() } as any);
    const { getByTestId } = renderWithProviders(
      React.createElement(NoteDetailScreen, { noteId: 1, onBack: () => {} }),
    );
    expect(getByTestId("markdown")).toBeTruthy();
    expect(getByTestId("markdown").textContent).toContain("tarefa markdown");
  });

  it("não renderiza markdown no modo edição", () => {
    vi.mocked(useNote).mockReturnValue({
      isPending: false,
      data: { id: 1, contentMd: "Conteúdo", version: 1 },
    } as any);
    vi.mocked(useUpdateNote).mockReturnValue({ mutate: vi.fn() } as any);
    const { queryByTestId, container } = renderWithProviders(
      React.createElement(NoteDetailScreen, { noteId: 1, onBack: () => {} }),
    );
    const buttons = Array.from(container.querySelectorAll("button"));
    const editBtn = buttons[buttons.length - 1] as HTMLButtonElement;
    fireEvent.click(editBtn);
    expect(queryByTestId("markdown")).toBeNull();
    expect(container.querySelector("input")).toBeTruthy();
  });
});
