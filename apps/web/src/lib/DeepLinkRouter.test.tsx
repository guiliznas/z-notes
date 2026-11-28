import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { DeepLinkRouter } from "./DeepLinkRouter";
import { useAuth } from "@/auth/AuthContext";
import { isTauriEnvironment, setToken } from "@/api/http";
import { getPendingCapture, onCaptureEvent } from "@/lib/deepLink";

const mockGetCurrent = vi.hoisted(() => vi.fn<() => Promise<string[] | null>>());
const mockOnOpenUrl = vi.hoisted(() => vi.fn<(cb: (urls: string[]) => void) => Promise<() => void>>());

vi.mock("@tauri-apps/plugin-deep-link", () => ({
  getCurrent: mockGetCurrent,
  onOpenUrl: mockOnOpenUrl,
}));

vi.mock("@/auth/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/api/http", () => ({
  isTauriEnvironment: vi.fn(),
  setToken: vi.fn(),
}));

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

describe("DeepLinkRouter", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(isTauriEnvironment).mockReturnValue(true);
    mockGetCurrent.mockResolvedValue(null);
    mockOnOpenUrl.mockResolvedValue(vi.fn());
  });

  it("processa deep link inicial no cold start via getCurrent()", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useAuth).mockReturnValue({
      status: "authenticated",
      user: { id: 1, email: "a@b.com", name: "A", avatarUrl: null, isAdmin: false },
      refresh,
      logout: vi.fn(),
      deleteAccount: vi.fn(),
    });
    mockGetCurrent.mockResolvedValue(["znotes://capture?text=Cold%20start"]);

    const events: Array<{ text?: string }> = [];
    const unsub = onCaptureEvent((detail) => events.push(detail));

    const { getByTestId } = render(
      <MemoryRouter initialEntries={["/"]}>
        <DeepLinkRouter />
        <LocationDisplay />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(getByTestId("location").textContent).toBe("/inbox");
    });

    expect(mockGetCurrent).toHaveBeenCalledTimes(1);
    expect(getPendingCapture()?.text).toBe("Cold start");
    expect(events).toEqual([{ text: "Cold start" }]);
    unsub();
  });

  it("processa znotes://auth?token=... no cold start", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useAuth).mockReturnValue({
      status: "unauthenticated",
      user: null,
      refresh,
      logout: vi.fn(),
      deleteAccount: vi.fn(),
    });
    mockGetCurrent.mockResolvedValue(["znotes://auth?token=tok-cold-123"]);

    render(
      <MemoryRouter initialEntries={["/"]}>
        <DeepLinkRouter />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(setToken).toHaveBeenCalledWith("tok-cold-123");
    });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("emite evento de captura mesmo quando usuário está deslogado (sem navegar para /inbox)", async () => {
    let urlCallback: ((urls: string[]) => void) | undefined;
    mockOnOpenUrl.mockImplementation(async (cb) => {
      urlCallback = cb;
      return vi.fn();
    });

    vi.mocked(useAuth).mockReturnValue({
      status: "unauthenticated",
      user: null,
      refresh: vi.fn(),
      logout: vi.fn(),
      deleteAccount: vi.fn(),
    });

    const events: Array<{ text?: string }> = [];
    const unsub = onCaptureEvent((detail) => events.push(detail));

    const { getByTestId } = render(
      <MemoryRouter initialEntries={["/"]}>
        <DeepLinkRouter />
        <LocationDisplay />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(urlCallback).toBeDefined();
    });

    urlCallback!(["znotes://capture?text=Deslogado"]);

    expect(getByTestId("location").textContent).toBe("/");
    expect(getPendingCapture()?.text).toBe("Deslogado");
    expect(events).toEqual([{ text: "Deslogado" }]);
    unsub();
  });
});
