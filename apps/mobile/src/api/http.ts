import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "z_notes_token";

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

let baseUrl = "http://10.0.2.2:8787"; // Android emulator localhost
let token: string | null = null;

export function setBaseUrl(url: string): void {
  baseUrl = url.replace(/\/+$/, "");
}

export async function loadToken(): Promise<string | null> {
  token = await SecureStore.getItemAsync(TOKEN_KEY);
  return token;
}

export async function saveToken(newToken: string): Promise<void> {
  token = newToken;
  await SecureStore.setItemAsync(TOKEN_KEY, newToken);
}

export async function clearToken(): Promise<void> {
  token = null;
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export function getToken(): string | null {
  return token;
}

export async function api<T>(
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<T> {
  const headers: Record<string, string> = {};
  const isForm = init?.body instanceof FormData;

  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!isForm && init?.body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${baseUrl}/api${path}`, {
    method: init?.method ?? "GET",
    headers,
    body: isForm ? (init.body as FormData) : init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });

  if (res.status === 401) {
    await clearToken();
    throw new ApiError(401, "unauthorized", "Sessão expirada. Faça login novamente.");
  }
  if (res.status === 204) return undefined as T;

  const isJson = res.headers.get("content-type")?.includes("application/json") ?? false;
  const body = isJson ? await res.json() : undefined;

  if (!res.ok) {
    const err = (body ?? {}) as { error?: string; message?: string };
    throw new ApiError(res.status, err.error ?? "error", err.message ?? res.statusText);
  }
  return body as T;
}