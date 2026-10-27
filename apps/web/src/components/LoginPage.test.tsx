import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LoginPage } from "./LoginPage";
import { resetBaseUrl } from "@/api/http";

const opener = vi.hoisted(() => ({ openUrl: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@tauri-apps/plugin-opener", () => opener);

describe("LoginPage", () => {
  const realLocation = window.location;
  afterEach(() => {
    Object.defineProperty(window, "location", { value: realLocation, writable: true, configurable: true });
  });

  function mockLocation() {
    Object.defineProperty(window, "location", {
      value: { href: "http://localhost/" },
      writable: true,
      configurable: true,
    });
  }

  it("mostra só o botão de entrar com Google", () => {
    mockLocation();
    render(
      <MemoryRouter initialEntries={["/"]}>
        <LoginPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: /entrar com google/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/senha/i)).not.toBeInTheDocument();
  });

  it("botão redireciona para o OAuth do servidor", () => {
    mockLocation();
    render(
      <MemoryRouter initialEntries={["/"]}>
        <LoginPage />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: /entrar com google/i }));
    expect(window.location.href).toBe("/api/auth/google");
  });

  it("explica quando o Google nega o login", () => {
    mockLocation();
    render(
      <MemoryRouter initialEntries={["/?auth=denied"]}>
        <LoginPage />
      </MemoryRouter>,
    );
    expect(screen.getByText("Login com Google foi cancelado.")).toBeInTheDocument();
  });

  it("no Tauri, abre o fluxo de app no navegador do sistema em vez de navegar o webview", async () => {
    mockLocation();
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    resetBaseUrl();
    localStorage.setItem("z_notes_server_url", "http://localhost:8787");
    try {
      render(
        <MemoryRouter initialEntries={["/"]}>
          <LoginPage />
        </MemoryRouter>,
      );
      fireEvent.click(screen.getByRole("button", { name: /entrar com google/i }));
      await screen.findByText(/conclua o login no navegador/i);
      expect(opener.openUrl).toHaveBeenCalledWith("http://localhost:8787/api/auth/google?client=app");
      expect(window.location.href).toBe("http://localhost/");
    } finally {
      delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
      localStorage.removeItem("z_notes_server_url");
    }
  });
});
