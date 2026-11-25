import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import LoginScreen from "./LoginScreen";

vi.mock("../api/resources", () => ({
  authMe: vi.fn(),
}));
vi.mock("../api/http", () => ({
  saveToken: vi.fn(),
  setBaseUrl: vi.fn(),
  getBaseUrl: () => "https://notes.exemplo.com",
  loadBaseUrl: () => Promise.resolve("https://notes.exemplo.com"),
}));

import { authMe } from "../api/resources";
import { saveToken } from "../api/http";
import { openAuthSessionAsync } from "expo-web-browser";

const openAuth = vi.mocked(openAuthSessionAsync);

function renderLogin(onAuthenticated = vi.fn()) {
  const utils = render(React.createElement(LoginScreen, { onAuthenticated }));
  return { ...utils, onAuthenticated, button: utils.container.querySelector("button")! };
}

describe("LoginScreen", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renderiza título, URL do servidor e botão Google", () => {
    const { getByText, container } = renderLogin();
    expect(getByText("z-notes")).toBeTruthy();
    expect(getByText("Entrar com Google")).toBeTruthy();
    expect(container.querySelectorAll("input").length).toBe(1);
  });

  it("abre o fluxo de app no navegador e autentica com o token do deep link", async () => {
    openAuth.mockResolvedValue({ type: "success", url: "znotes://auth?token=jwt123" } as never);
    vi.mocked(authMe).mockResolvedValue({ authenticated: true });
    const { button, onAuthenticated } = renderLogin();
    fireEvent.click(button);

    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledOnce());
    expect(openAuth).toHaveBeenCalledWith("https://notes.exemplo.com/api/auth/google?client=app", "znotes://auth");
    expect(saveToken).toHaveBeenCalledWith("jwt123");
  });

  it("não autentica quando o usuário cancela o navegador", async () => {
    openAuth.mockResolvedValue({ type: "cancel" } as never);
    const { button, onAuthenticated } = renderLogin();
    fireEvent.click(button);

    await waitFor(() => expect(openAuth).toHaveBeenCalled());
    expect(saveToken).not.toHaveBeenCalled();
    expect(onAuthenticated).not.toHaveBeenCalled();
  });

  it("não salva token quando o servidor devolve erro", async () => {
    openAuth.mockResolvedValue({ type: "success", url: "znotes://auth?error=denied" } as never);
    const { button, onAuthenticated } = renderLogin();
    fireEvent.click(button);

    await waitFor(() => expect(openAuth).toHaveBeenCalled());
    expect(saveToken).not.toHaveBeenCalled();
    expect(onAuthenticated).not.toHaveBeenCalled();
  });

  it("não autentica quando /auth/me recusa o token", async () => {
    openAuth.mockResolvedValue({ type: "success", url: "znotes://auth?token=jwt123" } as never);
    vi.mocked(authMe).mockResolvedValue({ authenticated: false });
    const { button, onAuthenticated } = renderLogin();
    fireEvent.click(button);

    await waitFor(() => expect(authMe).toHaveBeenCalled());
    expect(onAuthenticated).not.toHaveBeenCalled();
  });
});
