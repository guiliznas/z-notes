import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  parseDeepLink,
  savePendingCapture,
  getPendingCapture,
  clearPendingCapture,
  dispatchCaptureEvent,
  onCaptureEvent,
  PENDING_DESKTOP_CAPTURE_KEY,
} from "./deepLink";

describe("deepLink - parseDeepLink", () => {
  it("extrai deep link de autenticação com token ou erro", () => {
    expect(parseDeepLink("znotes://auth?token=token-jwt-123")).toEqual({
      type: "auth",
      token: "token-jwt-123",
      error: undefined,
    });

    expect(parseDeepLink("znotes://auth?error=access_denied")).toEqual({
      type: "auth",
      token: undefined,
      error: "access_denied",
    });

    expect(parseDeepLink("znotes://auth")).toBeNull();
  });

  it("extrai deep link de captura rápida (znotes://capture)", () => {
    // Sem parâmetros de texto: apenas focar o composer
    expect(parseDeepLink("znotes://capture")).toEqual({
      type: "capture",
      text: undefined,
    });

    // Com parâmetro text
    expect(parseDeepLink("znotes://capture?text=Comprar%20p%C3%A3o")).toEqual({
      type: "capture",
      text: "Comprar pão",
    });

    // Com parâmetro content alternativo
    expect(parseDeepLink("znotes://capture?content=Lembrar%20da%20reuni%C3%A3o")).toEqual({
      type: "capture",
      text: "Lembrar da reunião",
    });

    // Com parâmetro body
    expect(parseDeepLink("znotes://capture?body=Texto%20do%20corpo")).toEqual({
      type: "capture",
      text: "Texto do corpo",
    });
  });

  it("ignora URLs de esquemas inválidos ou URLs não-znotes", () => {
    expect(parseDeepLink("")).toBeNull();
    expect(parseDeepLink(null as unknown as string)).toBeNull();
    expect(parseDeepLink("https://notes.o.ziltro.dev/inbox")).toBeNull();
    expect(parseDeepLink("myapp://capture")).toBeNull();
  });

  it("retorna unknown para ações não reconhecidas do esquema znotes://", () => {
    expect(parseDeepLink("znotes://unknown-route?foo=bar")).toEqual({
      type: "unknown",
      rawUrl: "znotes://unknown-route?foo=bar",
    });
  });
});

describe("deepLink - pending desktop capture storage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("salva, lê e limpa captura rápida pendente", () => {
    savePendingCapture("Ideia para o projeto");
    const pending = getPendingCapture();
    expect(pending).not.toBeNull();
    expect(pending?.text).toBe("Ideia para o projeto");

    clearPendingCapture();
    expect(getPendingCapture()).toBeNull();
  });

  it("expira captura pendente após 15 minutos", () => {
    const sixteenMinutesAgo = Date.now() - 16 * 60 * 1000;
    localStorage.setItem(
      PENDING_DESKTOP_CAPTURE_KEY,
      JSON.stringify({ text: "Texto antigo", timestamp: sixteenMinutesAgo }),
    );

    expect(getPendingCapture()).toBeNull();
    expect(localStorage.getItem(PENDING_DESKTOP_CAPTURE_KEY)).toBeNull();
  });
});

describe("deepLink - dispatchCaptureEvent e onCaptureEvent", () => {
  it("dispara e recebe evento de captura rápida em tempo de execução", () => {
    const listener = vi.fn();
    const unsubscribe = onCaptureEvent(listener);

    dispatchCaptureEvent({ text: "Captura ao vivo via teclado" });
    expect(listener).toHaveBeenCalledWith({ text: "Captura ao vivo via teclado" });

    unsubscribe();
    dispatchCaptureEvent({ text: "Outra chamada" });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
