import * as SecureStore from "expo-secure-store";
import type { PublicUser } from "@z-notes/shared";

const TOKEN_KEY = "z_notes_token";
const BASE_URL_KEY = "z_notes_base_url";
const USER_KEY = "z_notes_current_user";
const USER_ID_KEY = "z_notes_user_id";

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

declare const __DEV__: boolean | undefined;

export function isDevBuild(): boolean {
  return typeof __DEV__ !== "undefined" && __DEV__ === true;
}

// O padrão http://10.0.2.2 (localhost do emulador Android) só existe no dev;
// em produção o servidor é informado pelo usuário e precisa ser https.
export const DEFAULT_BASE_URL = "http://10.0.2.2:8787";

let baseUrl = isDevBuild() ? DEFAULT_BASE_URL : "";
let token: string | null = null;
let currentUser: PublicUser | null = null;

/** URL normalizada se aceitável (https; http só no dev), senão null. */
export function normalizeBaseUrl(url: string): string | null {
  const clean = url.trim().replace(/\/+$/, "");
  if (/^https:\/\/[^/\s]+/i.test(clean)) return clean;
  if (isDevBuild() && /^http:\/\/[^/\s]+/i.test(clean)) return clean;
  return null;
}

export function setBaseUrl(url: string): void {
  const normalized = normalizeBaseUrl(url);
  if (!normalized) throw new Error("A URL do servidor precisa começar com https://");
  baseUrl = normalized;
  SecureStore.setItemAsync(BASE_URL_KEY, baseUrl).catch(() => {});
}

export async function loadBaseUrl(): Promise<string> {
  try {
    const stored = await SecureStore.getItemAsync(BASE_URL_KEY);
    const normalized = stored ? normalizeBaseUrl(stored) : null;
    if (normalized) baseUrl = normalized;
  } catch {
    // fallback
  }
  return baseUrl;
}

export function getBaseUrl(): string {
  return baseUrl;
}

export async function loadToken(): Promise<string | null> {
  token = await SecureStore.getItemAsync(TOKEN_KEY);
  return token;
}

export async function saveToken(newToken: string): Promise<void> {
  token = newToken;
  await SecureStore.setItemAsync(TOKEN_KEY, newToken);
}

export async function saveCurrentUser(user: PublicUser): Promise<void> {
  currentUser = user;
  await Promise.all([
    SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)),
    SecureStore.setItemAsync(USER_ID_KEY, String(user.id)),
  ]);
}

// O id fica à parte do usuário completo: mesmo sem o usuário salvo (ou corrompido),
// o cache offline abre na chave certa em vez de cair na chave sem id.
export async function loadUserId(): Promise<number | null> {
  try {
    const raw = await SecureStore.getItemAsync(USER_ID_KEY);
    const id = raw ? Number(raw) : NaN;
    return Number.isInteger(id) ? id : null;
  } catch {
    return null;
  }
}

export async function loadCurrentUser(): Promise<PublicUser | null> {
  try {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    currentUser = raw ? JSON.parse(raw) : null;
  } catch {
    currentUser = null;
  }
  return currentUser;
}

export function getCurrentUser(): PublicUser | null {
  return currentUser;
}

export async function clearCurrentUser(): Promise<void> {
  currentUser = null;
  await SecureStore.deleteItemAsync(USER_KEY);
}

export async function clearToken(): Promise<void> {
  token = null;
  currentUser = null;
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
    SecureStore.deleteItemAsync(USER_ID_KEY),
  ]);
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