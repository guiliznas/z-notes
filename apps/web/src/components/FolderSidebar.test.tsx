import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const h = vi.hoisted(() => ({ navigate: vi.fn(), pinned: [{ id: 1 }, { id: 2 }] as { id: number }[] }));

vi.mock("react-router-dom", () => ({ useNavigate: () => h.navigate }));
vi.mock("@/hooks/useSelection", () => ({
  useSelection: () => ({ source: { kind: "all" }, noteId: null, pane: "list" }),
}));
vi.mock("@/hooks/useNotes", () => ({ useNotes: () => ({ data: h.pinned }) }));
vi.mock("@/hooks/useFolders", () => ({
  useFolders: () => ({ data: [{ id: 5, name: "Trabalho", noteCount: 3, children: [] }] }),
  useCreateFolder: () => ({ mutate: vi.fn() }),
  useUpdateFolder: () => ({ mutate: vi.fn() }),
  useDeleteFolder: () => ({ mutate: vi.fn() }),
}));
vi.mock("./ui/Toast", () => ({ useToast: () => ({ notify: vi.fn() }) }));
vi.mock("./SidebarFooter", () => ({ SidebarFooter: () => null }));

import { FolderSidebar } from "./FolderSidebar";

describe("FolderSidebar", () => {
  beforeEach(() => vi.clearAllMocks());

  it("mostra Fixadas como primeiro item, acima de Todas as notas, com a contagem", () => {
    render(<FolderSidebar />);
    const labels = screen.getAllByRole("button").map((b) => b.textContent ?? "");
    const fixadas = labels.findIndex((t) => t.includes("Fixadas"));
    const todas = labels.findIndex((t) => t.includes("Todas as notas"));
    expect(fixadas).toBeGreaterThanOrEqual(0);
    expect(fixadas).toBeLessThan(todas);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("clicar em Fixadas navega para /pinned", () => {
    render(<FolderSidebar />);
    fireEvent.click(screen.getByRole("button", { name: /Fixadas/ }));
    expect(h.navigate).toHaveBeenCalledWith("/pinned");
  });

  it("sem fixadas não mostra contagem", () => {
    h.pinned = [];
    render(<FolderSidebar />);
    expect(screen.queryByText("0")).toBeNull();
    h.pinned = [{ id: 1 }, { id: 2 }];
  });
});
