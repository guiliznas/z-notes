import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import SettingsScreen from "./SettingsScreen";
import * as httpModule from "../api/http";
import { persister } from "../lib/storage";

describe("SettingsScreen", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renderiza campos de configurações", () => {
    vi.spyOn(httpModule, "getBaseUrl").mockReturnValue("http://teste.local:8787");
    const { getByDisplayValue, getByText } = render(
      React.createElement(SettingsScreen, { onBack: () => {}, onLogout: () => {} }),
    );

    expect(getByDisplayValue("http://teste.local:8787")).toBeTruthy();
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

  it("chama clearToken e onLogout ao confirmar saída", async () => {
    const clearTokenSpy = vi.spyOn(httpModule, "clearToken").mockResolvedValue();
    const removeClientSpy = vi.spyOn(persister, "removeClient").mockResolvedValue();
    const onLogout = vi.fn();

    // Mock Alert.alert para executar o handler de confirmação (botão "Sair")
    const { Alert } = await import("react-native");
    vi.spyOn(Alert, "alert").mockImplementation((_title, _msg, buttons) => {
      const sairBtn = buttons?.find((b: any) => b.text === "Sair");
      sairBtn?.onPress?.();
    });

    const { getByText } = render(
      React.createElement(SettingsScreen, { onBack: () => {}, onLogout }),
    );

    fireEvent.click(getByText("Sair da conta"));

    await waitFor(() => {
      expect(clearTokenSpy).toHaveBeenCalled();
      expect(removeClientSpy).toHaveBeenCalled();
      expect(onLogout).toHaveBeenCalled();
    });
  });
});
