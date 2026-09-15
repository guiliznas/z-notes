import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminPage } from "./AdminPage";
import { fetchAdminMetrics } from "@/api/resources";

vi.mock("@/api/resources", () => ({ fetchAdminMetrics: vi.fn() }));

const SERIES = {
  users_total: [
    { t: 1000, v: 1 },
    { t: 2000, v: 3 },
  ],
  notes_total: [
    { t: 1000, v: 2 },
    { t: 2000, v: 5 },
  ],
  notes_active: [{ t: 2000, v: 5 }],
  notes_archived: [],
  notes_trash: [],
  folders_total: [{ t: 2000, v: 1 }],
};

function renderPage() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AdminPage />
    </QueryClientProvider>,
  );
}

describe("AdminPage", () => {
  it("mostra valores atuais e evolução", async () => {
    vi.mocked(fetchAdminMetrics).mockResolvedValue({ series: SERIES });
    renderPage();
    await waitFor(() => expect(screen.getByText("Administração")).toBeInTheDocument());
    expect(screen.getByLabelText("Usuários").textContent).toContain("3");
    expect(screen.getByLabelText("Notas (total)").textContent).toContain("5");
    expect(screen.getAllByLabelText("evolução")).not.toHaveLength(0);
  });

  it("mostra estado vazio amigável com 1 ponto", async () => {
    vi.mocked(fetchAdminMetrics).mockResolvedValue({ series: { ...SERIES, users_total: [{ t: 1, v: 1 }] } });
    renderPage();
    await waitFor(() => expect(screen.getAllByText("sem histórico ainda")).not.toHaveLength(0));
  });

  it("mostra sem acesso quando a API nega (403 do backend)", async () => {
    vi.mocked(fetchAdminMetrics).mockRejectedValue(new Error("forbidden"));
    renderPage();
    await waitFor(() => expect(screen.getByText("Sem acesso às métricas.")).toBeInTheDocument(), {
      timeout: 3000,
    });
  });
});
