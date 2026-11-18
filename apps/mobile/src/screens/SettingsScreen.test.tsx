import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import SettingsScreen from "./SettingsScreen";
import * as httpModule from "../api/http";
import * as storageModule from "../lib/storage";

describe("SettingsScreen", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renderiza campos de configurações e informações da conta", () => {
    vi.spyOn(httpModule, "getBaseUrl").mockReturnValue("http://teste.local:8787");
    const mockUser = { id: 10, email: "guilherme@example.com", name: "Guilherme", avatarUrl: null, isAdmin: true };
    const { getByDisplayValue, getByText } = render(
      React.createElement(SettingsScreen, { user: mockUser, onBack: () => {}, onLogout: () => {} }),
    );

    expect(getByDisplayValue("http://teste.local:8787")).toBeTruthy();
    expect(getByText("Guilherme")).toBeTruthy();
    expect(getByText("guilherme@example.com")).toBeTruthy();
    expect(getByText("z-notes mobile v0.1.0")).toBeTruthy();
    expect(getByText("Sair da conta")).toBeTruthy();
  });

  it("atualiza a URL do servidor ao clicar em Salvar URL", () => {
    vi.spyOn(httpModule, "getBaseUrl").mockReturnValue("http://original:8787");
    const setBaseUrlSpy = vi.spyOn(httpModule, "setBaseUrl");

    const { getByDisplayValue, getByText } = render(
      React.createElement(SettingsScreen, { onBack: () => {}, onLogout: () => {} }),
    );

    const input = getByDisplayValue("http://original:8787");
    fireEvent.change(input, { target: { value: "http://novo-servidor.com" } });
    fireEvent.click(getByText("Salvar URL"));

    expect(setBaseUrlSpy).toHaveBeenCalledWith("http://novo-servidor.com");
  });

  it("chama clearToken, clearUserCache e onLogout ao confirmar saída", async () => {
    const clearTokenSpy = vi.spyOn(httpModule, "clearToken").mockResolvedValue();
    const clearUserCacheSpy = vi.spyOn(storageModule, "clearUserCache").mockResolvedValue();
    const onLogout = vi.fn();
    const mockUser = { id: 10, email: "guilherme@example.com", name: "Guilherme", avatarUrl: null, isAdmin: true };

    // Mock Alert.alert para executar o handler de confirmação (botão "Sair")
    const { Alert } = await import("react-native");
    vi.spyOn(Alert, "alert").mockImplementation((_title, _msg, buttons) => {
      const sairBtn = buttons?.find((b: any) => b.text === "Sair");
      sairBtn?.onPress?.();
    });

    const { getByText } = render(
      React.createElement(SettingsScreen, { user: mockUser, onBack: () => {}, onLogout }),
    );

    fireEvent.click(getByText("Sair da conta"));

    await waitFor(() => {
      expect(clearUserCacheSpy).toHaveBeenCalledWith(10);
      expect(clearTokenSpy).toHaveBeenCalled();
      expect(onLogout).toHaveBeenCalled();
    });
  });
});
