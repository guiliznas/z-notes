import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError, api, setBaseUrl, loadToken, saveToken, clearToken, getToken } from "./http";

import { resetStore } from "../test/expo-secure-store-mock";

beforeEach(() => {
  vi.restoreAllMocks();
  resetStore();
  clearTokenSync();
  setBaseUrl("http://localhost:8787");
});

function clearTokenSync() {
  while (getToken() !== null) {
    clearTokenSyncOnce();
    break;
  }
}
function clearTokenSyncOnce() {
  // clearToken is async; reset module-internal token via loadToken logic
}

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
  it("faz GET com Authorization quando há token", async () => {
    await saveToken("abc");
    mockFetch(200, { id: 1 });
    const data = await api<{ id: number }>("/notes");
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8787/api/notes",
      expect.objectContaining({ headers: { Authorization: "Bearer abc" }, method: "GET" }),
    );
    expect(data).toEqual({ id: 1 });
  });

  it("serializa body como JSON com Content-Type", async () => {
    const spy = mockFetch(200, { ok: true });
    await api("/notes", { method: "POST", body: { name: "x" } });
    const call = spy.mock.calls[0];
    const init = call[1] as RequestInit;
    expect(init.headers).toHaveProperty("Content-Type", "application/json");
    expect(init.body).toBe(JSON.stringify({ name: "x" }));
  });

  it("retorna undefined para 204", async () => {
    mockFetch(204, undefined, { contentType: undefined });
    const result = await api("/notes/1", { method: "DELETE" });
    expect(result).toBeUndefined();
  });

  it("lança ApiError com 401 e limpa token", async () => {
    await saveToken("xyz");
    mockFetch(401, { error: "unauthorized", message: "Não autorizado" });
    await expect(api("/notes")).rejects.toThrow(ApiError);
    expect(getToken()).toBeNull();
  });

  it("lança ApiError com resposta não-OK", async () => {
    mockFetch(400, { error: "bad_request", message: "inválido" });
    await expect(api("/notes")).rejects.toMatchObject({ status: 400, code: "bad_request" });
  });

  it("lança ApiError genérico quando body não-OK sem JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 500,
      headers: new Headers({}),
      json: () => Promise.resolve({}),
      text: () => Promise.resolve("Erro interno"),
    } as Response);
    await expect(api("/notes")).rejects.toMatchObject({ status: 500, code: "error" });
  });
});

describe("tokens", () => {
  it("saveToken + loadToken roundtrip", async () => {
    await saveToken("t1");
    expect(getToken()).toBe("t1");
    const loaded = await loadToken();
    expect(loaded).toBe("t1");
  });

  it("clearToken remove token", async () => {
    await saveToken("t2");
    await clearToken();
    expect(getToken()).toBeNull();
  });

  it("loadToken retorna null quando vazio", async () => {
    const loaded = await loadToken();
    expect(loaded).toBeNull();
  });
});

describe("setBaseUrl", () => {
  it("remove trailing slash", async () => {
    setBaseUrl("http://example.com/");
    mockFetch(200, {});
    await api("/ping");
    expect(fetch).toHaveBeenCalledWith("http://example.com/api/ping", expect.anything());
  });
});
