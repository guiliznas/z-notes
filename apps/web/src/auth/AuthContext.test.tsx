import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, renderHook } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";
import { authMe, authLogout } from "@/api/resources";
import { clearUserCache } from "@/offline/queryClient";

vi.mock("@/api/resources", () => ({ authMe: vi.fn(), authLogout: vi.fn() }));
vi.mock("@/offline/queryClient", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/offline/queryClient")>();
  return { ...mod, clearUserCache: vi.fn().mockResolvedValue(undefined) };
});

const USER = { id: 7, email: "user@example.com", name: "User", avatarUrl: null, isAdmin: false };

function Probe() {
  const { status, user, logout } = useAuth();
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="email">{user?.email ?? "sem-user"}</span>
      <button onClick={() => logout()}>sair</button>
    </div>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("expõe o usuário do me", async () => {
    vi.mocked(authMe).mockResolvedValue({ authenticated: true, user: USER });
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("authenticated"));
    expect(screen.getByTestId("email")).toHaveTextContent("user@example.com");
  });

  it("logout chama a API e limpa o cache do usuário", async () => {
    vi.mocked(authMe).mockResolvedValue({ authenticated: true, user: USER });
    vi.mocked(authLogout).mockResolvedValue({ ok: true });
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("authenticated"));

    fireEvent.click(screen.getByText("sair"));
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated"));
    expect(authLogout).toHaveBeenCalledTimes(1);
    expect(clearUserCache).toHaveBeenCalledWith(7);
    expect(screen.getByTestId("email")).toHaveTextContent("sem-user");
  });

  it("me negativo vira unauthenticated", async () => {
    vi.mocked(authMe).mockResolvedValue({ authenticated: false });
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated"));
  });

  it("lança erro se useAuth chamado fora do provider", () => {
    expect(() => renderHook(() => useAuth()).result.current).toThrow("useAuth deve ser usado dentro de AuthProvider");
  });
});

