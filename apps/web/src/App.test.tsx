import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { App } from "./App";
import { useAuth } from "@/auth/AuthContext";

vi.mock("@/auth/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("@/components/NotesPage", () => ({ NotesPage: () => <div>página de notas</div> }));
vi.mock("@/api/resources", () => ({ fetchAdminMetrics: vi.fn().mockResolvedValue({ series: {} }) }));

const ADMIN = { id: 1, email: "a@x.com", name: "A", avatarUrl: null, isAdmin: true };
const COMMON = { ...ADMIN, id: 2, isAdmin: false };

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe("App /admin", () => {
  it("renderiza o dashboard para admin", async () => {
    vi.mocked(useAuth).mockReturnValue({ status: "authenticated", user: ADMIN, refresh: vi.fn(), logout: vi.fn() });
    renderAt("/admin");
    await waitFor(() => expect(screen.getByText("Administração")).toBeInTheDocument());
  });

  it("não-admin cai de volta nas notas (backend barraria de todo modo)", async () => {
    vi.mocked(useAuth).mockReturnValue({ status: "authenticated", user: COMMON, refresh: vi.fn(), logout: vi.fn() });
    renderAt("/admin");
    await waitFor(() => expect(screen.getByText("página de notas")).toBeInTheDocument());
    expect(screen.queryByText("Administração")).not.toBeInTheDocument();
  });
});
