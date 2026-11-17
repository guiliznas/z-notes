export type ParsedDeepLink =
  | { type: "auth"; token?: string; error?: string }
  | { type: "capture"; text?: string }
  | { type: "unknown"; rawUrl: string };

export const PENDING_DESKTOP_CAPTURE_KEY = "znotes_pending_desktop_capture";
export const DESKTOP_CAPTURE_EVENT_NAME = "znotes:desktop-capture";

export interface PendingDesktopCapture {
  text?: string;
  timestamp: number;
}

/**
 * Faz o parsing de URIs do esquema znotes://.
 * Suporta:
 * - znotes://auth?token=... (ou ?error=...)
 * - znotes://capture (com ?text= ou ?content= opcional)
 */
export function parseDeepLink(rawUrl: string): ParsedDeepLink | null {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const trimmed = rawUrl.trim();
  if (!trimmed.toLowerCase().startsWith("znotes://")) return null;

  try {
    // Normaliza para WHATWG URL trocando o esquema por http para parsing confiável
    const withoutScheme = trimmed.slice("znotes://".length);
    const parsed = new URL(`http://${withoutScheme}`);
    const hostOrAction = parsed.hostname.toLowerCase();

    if (hostOrAction === "auth") {
      const token = parsed.searchParams.get("token") || undefined;
      const error = parsed.searchParams.get("error") || undefined;
      if (!token && !error) return null;
      return { type: "auth", token, error };
    }

    if (hostOrAction === "capture") {
      const text =
        parsed.searchParams.get("text") ??
        parsed.searchParams.get("content") ??
        parsed.searchParams.get("body") ??
        undefined;
      return { type: "capture", text: text ? text.trim() : undefined };
    }

    return { type: "unknown", rawUrl: trimmed };
  } catch {
    const match = trimmed.match(/^znotes:\/\/([a-zA-Z0-9_-]+)(?:\?(.*))?$/i);
    if (!match) return null;
    const action = match[1].toLowerCase();
    const query = new URLSearchParams(match[2] || "");

    if (action === "auth") {
      const token = query.get("token") || undefined;
      const error = query.get("error") || undefined;
      if (!token && !error) return null;
      return { type: "auth", token, error };
    }

    if (action === "capture") {
      const text = query.get("text") ?? query.get("content") ?? query.get("body") ?? undefined;
      return { type: "capture", text: text ? text.trim() : undefined };
    }

    return { type: "unknown", rawUrl: trimmed };
  }
}

/** Salva captura pendente para restaurar após login */
export function savePendingCapture(text?: string): void {
  try {
    const payload: PendingDesktopCapture = {
      text: text?.trim() || undefined,
      timestamp: Date.now(),
    };
    localStorage.setItem(PENDING_DESKTOP_CAPTURE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

/** Retorna captura pendente válida (expira em 15 minutos) */
export function getPendingCapture(): PendingDesktopCapture | null {
  try {
    const raw = localStorage.getItem(PENDING_DESKTOP_CAPTURE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingDesktopCapture;
    if (Date.now() - parsed.timestamp > 15 * 60 * 1000) {
      clearPendingCapture();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingCapture(): void {
  try {
    localStorage.removeItem(PENDING_DESKTOP_CAPTURE_KEY);
  } catch {
    // ignore
  }
}

export interface DesktopCaptureEventDetail {
  text?: string;
}

/** Notifica a interface sobre uma solicitação de captura rápida */
export function dispatchCaptureEvent(detail: DesktopCaptureEventDetail = {}): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<DesktopCaptureEventDetail>(DESKTOP_CAPTURE_EVENT_NAME, { detail }));
}

/** Inscreve um ouvinte para eventos de captura rápida desktop */
export function onCaptureEvent(listener: (detail: DesktopCaptureEventDetail) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (event: Event) => {
    const custom = event as CustomEvent<DesktopCaptureEventDetail>;
    listener(custom.detail || {});
  };
  window.addEventListener(DESKTOP_CAPTURE_EVENT_NAME, handler);
  return () => window.removeEventListener(DESKTOP_CAPTURE_EVENT_NAME, handler);
}
