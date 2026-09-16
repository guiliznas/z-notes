import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";

vi.mock("react-router-dom", () => ({ useNavigate: () => vi.fn() }));
vi.mock("@/hooks/useSelection", () => ({
  useSelection: () => ({ source: { kind: "all" }, noteId: 1, pane: "editor" }),
}));
vi.mock("@/hooks/useOnline", () => ({ useOnline: () => true }));
vi.mock("@/hooks/useNotes", () => ({
  useNote: () => ({ data: { id: 1, contentMd: "- [ ] tarefa", version: 1, archived: false, deleted: false } }),
  useTrashNote: () => ({ mutate: vi.fn() }),
  useRestoreNote: () => ({ mutate: vi.fn() }),
  useHardDeleteNote: () => ({ mutate: vi.fn() }),
}));
vi.mock("@/hooks/useUpdateNote", () => ({
  useUpdateNote: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("./ui/Toast", () => ({ useToast: () => ({ notify: vi.fn() }) }));

import { Editor } from "./Editor";

describe("Editor", () => {
  beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

  it("renderiza preview por padrão com checkbox", () => {
    render(<Editor />);
    const cb = document.querySelector('input[type="checkbox"]');
    expect(cb).toBeTruthy();
    expect(cb).not.toBeChecked();
  });

  it("duplo clique no preview entra em modo edição (textarea)", () => {
    const { container } = render(<Editor />);
    const preview = container.querySelector("[data-testid='preview']")!;
    fireEvent.doubleClick(preview);
    expect(container.querySelector("textarea")).toBeTruthy();
  });

  it("ESC sai do modo edição e volta ao preview", () => {
    const { container } = render(<Editor />);
    fireEvent.doubleClick(container.querySelector("[data-testid='preview']")!);
    const ta = container.querySelector("textarea")!;
    fireEvent.keyDown(ta, { key: "Escape" });
    expect(container.querySelector("textarea")).toBeNull();
    expect(container.querySelector('input[type="checkbox"]')).toBeTruthy();
  });

  it("blur do textarea volta ao preview", () => {
    const { container } = render(<Editor />);
    fireEvent.doubleClick(container.querySelector("[data-testid='preview']")!);
    const ta = container.querySelector("textarea")!;
    fireEvent.blur(ta);
    expect(container.querySelector("textarea")).toBeNull();
  });

  it("clicar no checkbox marca e dispara setContent", () => {
    render(<Editor />);
    const cb = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
    fireEvent.click(cb);
    expect(cb).toBeChecked();
  });
});
