import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError, api, setUnauthorizedHandler } from "./http";

beforeEach(() => {
  vi.restoreAllMocks();
});

function mockFetch(status: number, body?: unknown, opts?: { contentType?: string }) {
  const ok = status >= 200 && status < 300;
  return vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
    ok,
    status,
    headers: new Headers({ "content-type": opts?.contentType ?? "application/json" }),
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(String(body)),
  } as Response);
}

describe("ApiError", () => {
  it("cria erro com nome, status e code", () => {
    const err = new ApiError(400, "bad_request", "deu ruim");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("ApiError");
    expect(err.status).toBe(400);
    expect(err.code).toBe("bad_request");
    expect(err.message).toBe("deu ruim");
  });
});

describe("api", () => {
  it("faz GET e retorna JSON", async () => {
    mockFetch(200, { id: 1 });
    const data = await api<{ id: number }>("/notes");
    expect(fetch).toHaveBeenCalledWith("/api/notes", expect.objectContaining({ credentials: "include" }));
    expect(data).toEqual({ id: 1 });
  });

  it("serializa body como JSON por padrão", async () => {
    mockFetch(200, { ok: true });
    await api("/notes", { method: "POST", body: JSON.stringify({ name: "x" }) });
    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect((init as RequestInit).headers).toHaveProperty("Content-Type", "application/json");
  });

  it("não força Content-Type para FormData", async () => {
    const form = new FormData();
    form.append("k", "v");
    mockFetch(200, { ok: true });
    await api("/import", { method: "POST", body: form });
    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect((init as RequestInit).headers).not.toHaveProperty("Content-Type");
  });

  it("retorna undefined para 204", async () => {
    mockFetch(204, undefined, { contentType: undefined });
    const result = await api("/notes/1", { method: "DELETE" });
    expect(result).toBeUndefined();
  });

  it("lança ApiError com 401 e chama handler", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    mockFetch(401, { error: "unauthorized", message: "Não autorizado" });
    await expect(api("/notes")).rejects.toThrow(ApiError);
    expect(handler).toHaveBeenCalledOnce();
  });

  it("lança ApiError com resposta não-OK", async () => {
    mockFetch(400, { error: "bad_request", message: "inválido" });
    await expect(api("/notes")).rejects.toMatchObject({ status: 400, code: "bad_request" });
  });

  it("lança ApiError genérico quando body não é JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 500,
      headers: new Headers({}),
      json: () => Promise.reject(new Error("no json")),
      text: () => Promise.resolve("Erro interno"),
    } as Response);
    await expect(api("/notes")).rejects.toMatchObject({ status: 500, code: "error" });
  });

  it("utiliza baseUrl configurada quando definida", async () => {
    mockFetch(200, { ok: true });
    const { setBaseUrl, resetBaseUrl } = await import("./http");
    setBaseUrl("http://localhost:8787");
    await api("/folders");
    expect(fetch).toHaveBeenCalledWith("http://localhost:8787/api/folders", expect.anything());
    resetBaseUrl();
  });
});

describe("baseURL management", () => {
  it("permite definir, ler e resetar baseUrl", async () => {
    const { getBaseUrl, setBaseUrl, resetBaseUrl } = await import("./http");
    resetBaseUrl();
    expect(getBaseUrl()).toBe("");

    setBaseUrl("https://notes.example.com/");
    expect(getBaseUrl()).toBe("https://notes.example.com");

    resetBaseUrl();
    expect(getBaseUrl()).toBe("");
  });
});

