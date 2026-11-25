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

  it("sem sessão, atualiza a URL do servidor (https) sem deslogar", async () => {
    vi.spyOn(httpModule, "getBaseUrl").mockReturnValue("https://original.test");
    vi.spyOn(httpModule, "getToken").mockReturnValue(null);
    const setBaseUrlSpy = vi.spyOn(httpModule, "setBaseUrl").mockImplementation(() => {});
    const onLogout = vi.fn();

    const { getByDisplayValue, getByText } = render(
      React.createElement(SettingsScreen, { onBack: () => {}, onLogout }),
    );

    fireEvent.change(getByDisplayValue("https://original.test"), { target: { value: "https://novo.test" } });
    fireEvent.click(getByText("Salvar URL"));

    await waitFor(() => expect(setBaseUrlSpy).toHaveBeenCalledWith("https://novo.test"));
    expect(onLogout).not.toHaveBeenCalled();
  });

  it("com sessão aberta, trocar a URL encerra a sessão antes de gravar o host novo", async () => {
    vi.spyOn(httpModule, "getBaseUrl").mockReturnValue("https://original.test");
    vi.spyOn(httpModule, "getToken").mockReturnValue("jwt");
    const order: string[] = [];
    vi.spyOn(httpModule, "setBaseUrl").mockImplementation(() => {
      order.push("setBaseUrl");
    });
    const onLogout = vi.fn(async () => {
      order.push("logout");
    });

    const { getByDisplayValue, getByText } = render(
      React.createElement(SettingsScreen, { onBack: () => {}, onLogout }),
    );

    fireEvent.change(getByDisplayValue("https://original.test"), { target: { value: "https://outro.test" } });
    fireEvent.click(getByText("Salvar URL"));

    await waitFor(() => expect(order).toEqual(["logout", "setBaseUrl"]));
  });

  it("recusa URL http:// fora do dev e não grava nem desloga", async () => {
    vi.spyOn(httpModule, "getBaseUrl").mockReturnValue("https://original.test");
    vi.spyOn(httpModule, "getToken").mockReturnValue("jwt");
    const setBaseUrlSpy = vi.spyOn(httpModule, "setBaseUrl");
    const onLogout = vi.fn();
    const { Alert } = await import("react-native");
    const alertSpy = vi.spyOn(Alert, "alert").mockImplementation(() => {});

    const { getByDisplayValue, getByText } = render(
      React.createElement(SettingsScreen, { onBack: () => {}, onLogout }),
    );

    fireEvent.change(getByDisplayValue("https://original.test"), { target: { value: "http://inseguro.test" } });
    fireEvent.click(getByText("Salvar URL"));

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    expect(setBaseUrlSpy).not.toHaveBeenCalled();
    expect(onLogout).not.toHaveBeenCalled();
  });

  it("chama onLogout ao confirmar saída (a limpeza é feita no App, uma vez só)", async () => {
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
      expect(onLogout).toHaveBeenCalledTimes(1);
    });
    expect(clearUserCacheSpy).not.toHaveBeenCalled();
    expect(clearTokenSpy).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(onLogout).toHaveBeenCalled();
    });
  });

  it("limpa cache em memória e usa userId da sessão offline quando user é null", async () => {
    const clearUserCacheSpy = vi.spyOn(storageModule, "clearUserCache").mockResolvedValue();
    const onClearMemoryCache = vi.fn();
    const { Alert } = await import("react-native");
    vi.spyOn(Alert, "alert").mockImplementation((_title, _msg, buttons) => {
      const limparBtn = buttons?.find((b: any) => b.text === "Limpar");
      limparBtn?.onPress?.();
    });

    const { getByText } = render(
      React.createElement(SettingsScreen, {
        user: null,
        userId: 77,
        onClearMemoryCache,
        onBack: () => {},
        onLogout: () => {},
      }),
    );

    fireEvent.click(getByText("Limpar cache local"));

    await waitFor(() => {
      expect(onClearMemoryCache).toHaveBeenCalledTimes(1);
      expect(clearUserCacheSpy).toHaveBeenCalledWith(77);
    });
  });
});
