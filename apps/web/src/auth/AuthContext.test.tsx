import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";
import type { ReactNode } from "react";

const mockAuthMe = vi.fn();
const mockAuthLogin = vi.fn();
const mockAuthLogout = vi.fn();

vi.mock("@/api/resources", () => ({
  authMe: (...args: unknown[]) => mockAuthMe(...args),
  authLogin: (...args: unknown[]) => mockAuthLogin(...args),
  authLogout: (...args: unknown[]) => mockAuthLogout(...args),
}));

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("começa como loading e vai para unauthenticated quando authMe falha", async () => {
    mockAuthMe.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("unauthenticated"));
  });

  it("autentica quando authMe retorna authenticated=true", async () => {
    mockAuthMe.mockResolvedValue({ authenticated: true });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("authenticated"));
  });

  it("login chama authLogin e muda status", async () => {
    mockAuthMe.mockResolvedValue({ authenticated: false });
    mockAuthLogin.mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("unauthenticated"));
    await act(async () => { await result.current.login("senha"); });
    expect(mockAuthLogin).toHaveBeenCalledWith("senha");
    expect(result.current.status).toBe("authenticated");
  });

  it("logout chama authLogout e volta para unauthenticated", async () => {
    mockAuthMe.mockResolvedValue({ authenticated: true });
    mockAuthLogout.mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    await act(async () => { await result.current.logout(); });
    expect(mockAuthLogout).toHaveBeenCalledOnce();
    expect(result.current.status).toBe("unauthenticated");
  });

  it("lança erro se useAuth chamado fora do provider", () => {
    expect(() => renderHook(() => useAuth()).result.current).toThrow("useAuth deve ser usado dentro de AuthProvider");
  });
});
