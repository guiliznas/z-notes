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

  const res = await fetch(`/api${path}`, { credentials: "include", ...init, headers });

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
