import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { notifyBackupFailure } from "./notify.js";

describe("notifyBackupFailure", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("não faz nada se nenhuma URL for configurada", async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    await notifyBackupFailure(undefined, new Error("falhou"));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("faz POST com o payload esperado quando URL está configurada", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as unknown as typeof fetch;

    await notifyBackupFailure("https://example.com/hook", new Error("disco cheio"));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://example.com/hook");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body);
    expect(body.event).toBe("backup_failed");
    expect(body.error).toBe("disco cheio");
    expect(typeof body.timestamp).toBe("number");
  });

  it("nunca propaga exceção se o próprio webhook falhar", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("rede fora do ar")) as unknown as typeof fetch;
    await expect(notifyBackupFailure("https://example.com/hook", new Error("x"))).resolves.toBeUndefined();
  });

  it("aceita erro que não é instância de Error", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as unknown as typeof fetch;
    await notifyBackupFailure("https://example.com/hook", "string de erro crua");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.error).toBe("string de erro crua");
  });
});
