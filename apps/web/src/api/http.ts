export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export const STORAGE_BASE_URL_KEY = "z_notes_server_url";

export function isTauriEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "__TAURI_INTERNALS__" in window ||
    "__TAURI__" in window ||
    window.location.protocol === "tauri:" ||
    window.location.hostname === "tauri.localhost"
  );
}

export function getDefaultBaseUrl(): string {
  if (isTauriEnvironment()) {
    return "http://localhost:8787";
  }
  return "";
}

let currentBaseUrl: string | null = null;

export function getBaseUrl(): string {
  if (currentBaseUrl !== null) return currentBaseUrl;
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(STORAGE_BASE_URL_KEY);
    if (stored && stored.trim()) {
      currentBaseUrl = stored.trim().replace(/\/+$/, "");
      return currentBaseUrl;
    }
  }
  return getDefaultBaseUrl();
}

export function setBaseUrl(url: string): void {
  const clean = url.trim().replace(/\/+$/, "");
  currentBaseUrl = clean;
  if (typeof window !== "undefined") {
    if (clean) {
      localStorage.setItem(STORAGE_BASE_URL_KEY, clean);
    } else {
      localStorage.removeItem(STORAGE_BASE_URL_KEY);
    }
  }
}

export function resetBaseUrl(): void {
  currentBaseUrl = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_BASE_URL_KEY);
  }
}

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler): void {
  unauthorizedHandler = handler;
}

interface ErrorBody {
  error?: string;
  message?: string;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const isForm = init?.body instanceof FormData;
  const headers: Record<string, string> = { ...(init?.headers as Record<string, string>) };
  if (!isForm && init?.body !== undefined) headers["Content-Type"] = "application/json";

  const base = getBaseUrl();
  const url = base ? `${base}/api${path}` : `/api${path}`;
  const res = await fetch(url, { credentials: "include", ...init, headers });

  if (res.status === 401) {
    unauthorizedHandler?.();
    throw new ApiError(401, "unauthorized", "Sessão expirada. Faça login novamente.");
  }
  if (res.status === 204) return undefined as T;

  const isJson = res.headers.get("content-type")?.includes("application/json") ?? false;
  const body = isJson ? await res.json() : undefined;

  if (!res.ok) {
    const err = (body ?? {}) as ErrorBody;
    throw new ApiError(res.status, err.error ?? "error", err.message ?? res.statusText);
  }
  return body as T;
}

