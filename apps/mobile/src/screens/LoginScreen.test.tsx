import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import LoginScreen from "./LoginScreen";

vi.mock("../api/resources", () => ({
  authLogin: vi.fn(),
  authMe: vi.fn(),
}));

import { authLogin, authMe } from "../api/resources";

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    React.createElement(QueryClientProvider, { client: qc }, ui),
  );
}

function getPasswordInput(container: HTMLElement): HTMLInputElement {
  return Array.from(container.querySelectorAll("input")).find((el) => el.type === "password")!;
}

function getSubmitButton(container: HTMLElement): HTMLButtonElement {
  return container.querySelector("button")!;
}

describe("LoginScreen", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renderiza título e inputs", () => {
    const { getByText, container } = renderWithProviders(
      React.createElement(LoginScreen, { onAuthenticated: () => {} }),
    );
    expect(getByText("z-notes")).toBeTruthy();
    expect(container.querySelectorAll("input").length).toBe(2);
    expect(container.querySelector("button")).toBeTruthy();
  });

  it("chama onAuthenticated após login com sucesso", async () => {
    vi.mocked(authLogin).mockResolvedValue({ ok: true, token: "t1" });
    vi.mocked(authMe).mockResolvedValue({ authenticated: true });
    const onAuth = vi.fn();
    const { container } = renderWithProviders(
      React.createElement(LoginScreen, { onAuthenticated: onAuth }),
    );

    const pwd = getPasswordInput(container);
    fireEvent.change(pwd, { target: { value: "senha123" } });
    fireEvent.click(getSubmitButton(container));

    await waitFor(() => expect(onAuth).toHaveBeenCalledOnce());
    expect(authLogin).toHaveBeenCalledWith("senha123");
  });

  it("não chama onAuthenticated quando auth Me falha", async () => {
    vi.mocked(authLogin).mockResolvedValue({ ok: true, token: "t1" });
    vi.mocked(authMe).mockResolvedValue({ authenticated: false });
    const onAuth = vi.fn();
    const { container } = renderWithProviders(
      React.createElement(LoginScreen, { onAuthenticated: onAuth }),
    );

    const pwd = getPasswordInput(container);
    fireEvent.change(pwd, { target: { value: "x" } });
    fireEvent.click(getSubmitButton(container));

    await waitFor(() => expect(authMe).toHaveBeenCalled());
    expect(onAuth).not.toHaveBeenCalled();
  });

  it("não chama onAuthenticated quando authLogin rejeita", async () => {
    vi.mocked(authLogin).mockRejectedValue(new Error("conexão recusada"));
    const onAuth = vi.fn();
    const { container } = renderWithProviders(
      React.createElement(LoginScreen, { onAuthenticated: onAuth }),
    );

    const pwd = getPasswordInput(container);
    fireEvent.change(pwd, { target: { value: "x" } });
    fireEvent.click(getSubmitButton(container));

    await waitFor(() => expect(authLogin).toHaveBeenCalled());
    expect(onAuth).not.toHaveBeenCalled();
  });
});
