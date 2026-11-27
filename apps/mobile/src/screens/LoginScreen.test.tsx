import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import LoginScreen from "./LoginScreen";

vi.mock("../api/resources", () => ({
  authMe: vi.fn(),
  authPassword: vi.fn(),
}));
vi.mock("../api/http", () => ({
  ApiError: class ApiError extends Error {
    constructor(public status: number, public code: string, message: string) {
      super(message);
    }
  },
  saveToken: vi.fn(),
  saveCurrentUser: vi.fn(),
  setBaseUrl: vi.fn(),
  getBaseUrl: () => "https://notes.exemplo.com",
  loadBaseUrl: () => Promise.resolve("https://notes.exemplo.com"),
}));

import { Alert } from "react-native";
import { authMe, authPassword } from "../api/resources";
import { ApiError, saveToken, saveCurrentUser } from "../api/http";
import { openAuthSessionAsync } from "expo-web-browser";

const openAuth = vi.mocked(openAuthSessionAsync);

function renderLogin(onAuthenticated = vi.fn()) {
  const utils = render(React.createElement(LoginScreen, { onAuthenticated }));
  return { ...utils, onAuthenticated, button: utils.container.querySelector("button")! };
}

describe("LoginScreen", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renderiza título, URL do servidor, botão Google e o formulário de usuário e senha", () => {
    const { getByText, getByPlaceholderText, queryByText } = renderLogin();
    expect(getByText("z-notes")).toBeTruthy();
    expect(getByText("Entrar com Google")).toBeTruthy();
    expect(getByPlaceholderText("URL do servidor")).toBeTruthy();
    expect(getByPlaceholderText("Usuário")).toBeTruthy();
    expect(getByPlaceholderText("Senha").getAttribute("type")).toBe("password");
    expect(getByText("Entrar")).toBeTruthy();
    expect(queryByText(/cadastr|criar conta/i)).toBeNull();
  });

  it("abre o fluxo de app no navegador e autentica com o token do deep link", async () => {
    const mockUser = { id: 1, email: "user@example.com", name: "User", avatarUrl: null, isAdmin: false };
    openAuth.mockResolvedValue({ type: "success", url: "znotes://auth?token=jwt123" } as never);
    vi.mocked(authMe).mockResolvedValue({ authenticated: true, user: mockUser });
    const { button, onAuthenticated } = renderLogin();
    fireEvent.click(button);

    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledWith(mockUser));
    expect(openAuth).toHaveBeenCalledWith("https://notes.exemplo.com/api/auth/google?client=app", "znotes://auth");
    expect(saveToken).toHaveBeenCalledWith("jwt123");
    expect(saveCurrentUser).toHaveBeenCalledWith(mockUser);
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

  describe("usuário e senha", () => {
    const testUser = { id: 7, email: "t@z-notes.invalid", name: "revisor", avatarUrl: null, isAdmin: false };

    function fill(utils: ReturnType<typeof renderLogin>, user: string, pass: string) {
      fireEvent.change(utils.getByPlaceholderText("Usuário"), { target: { value: user } });
      fireEvent.change(utils.getByPlaceholderText("Senha"), { target: { value: pass } });
      fireEvent.click(utils.getByText("Entrar"));
    }

    it("autentica, salva o token e o usuário", async () => {
      vi.mocked(authPassword).mockResolvedValue({ token: "jwt-teste", user: testUser });
      const utils = renderLogin();
      fill(utils, " revisor ", "senha-ficticia");

      await waitFor(() => expect(utils.onAuthenticated).toHaveBeenCalledWith(testUser));
      expect(authPassword).toHaveBeenCalledWith("revisor", "senha-ficticia");
      expect(saveToken).toHaveBeenCalledWith("jwt-teste");
      expect(saveCurrentUser).toHaveBeenCalledWith(testUser);
      expect(openAuth).not.toHaveBeenCalled();
    });

    it("mostra o carregamento só no botão tocado, desativa os dois e ignora novo envio", async () => {
      let finish!: () => void;
      vi.mocked(authPassword).mockReturnValue(
        new Promise((_resolve, reject) => {
          finish = () => reject(new Error("falhou"));
        }),
      );
      const utils = renderLogin();
      fill(utils, "revisor", "errada");

      const [google, secondary] = Array.from(utils.container.querySelectorAll("button"));
      expect(secondary.textContent).toBe("Entrando...");
      expect(google.textContent).toBe("Entrar com Google");
      expect(google.disabled).toBe(true);
      expect(secondary.disabled).toBe(true);
      fireEvent.keyDown(utils.getByPlaceholderText("Senha"), { key: "Enter" });
      expect(authPassword).toHaveBeenCalledTimes(1);

      finish();
      await waitFor(() => expect(secondary.textContent).toBe("Entrar"));
      expect(google.disabled).toBe(false);
    });

    it("durante o login com Google o carregamento fica só no botão do Google", () => {
      openAuth.mockReturnValue(new Promise(() => {}) as never);
      const utils = renderLogin();
      fireEvent.click(utils.button);

      const [google, secondary] = Array.from(utils.container.querySelectorAll("button"));
      expect(google.textContent).toBe("Entrando...");
      expect(secondary.textContent).toBe("Entrar");
      expect(secondary.disabled).toBe(true);
    });

    it("explica em português quando não alcança o servidor", async () => {
      const alert = vi.spyOn(Alert, "alert");
      vi.mocked(authPassword).mockRejectedValue(new TypeError("Network request failed"));
      const utils = renderLogin();
      fill(utils, "revisor", "errada");

      await waitFor(() => expect(alert).toHaveBeenCalledWith("Erro", "Não foi possível conectar ao servidor"));
    });

    it("não chama o servidor com campos vazios", () => {
      const alert = vi.spyOn(Alert, "alert");
      const utils = renderLogin();
      fireEvent.click(utils.getByText("Entrar"));

      expect(authPassword).not.toHaveBeenCalled();
      expect(alert).toHaveBeenCalledWith("Erro", "Informe usuário e senha");
    });

    it.each([
      [401, "Usuário ou senha inválidos"],
      [404, "Este servidor não aceita login com usuário e senha"],
      [429, "Muitas tentativas. Aguarde um minuto e tente de novo"],
      [500, "Erro interno"],
    ])("explica o erro %i e não autentica", async (status, message) => {
      const alert = vi.spyOn(Alert, "alert");
      vi.mocked(authPassword).mockRejectedValue(new ApiError(status, "x", "Erro interno"));
      const utils = renderLogin();
      fill(utils, "revisor", "errada");

      await waitFor(() => expect(alert).toHaveBeenCalledWith("Erro", message));
      expect(saveToken).not.toHaveBeenCalled();
      expect(utils.onAuthenticated).not.toHaveBeenCalled();
    });
  });
});
