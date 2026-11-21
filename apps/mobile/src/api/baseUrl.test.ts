import { describe, it, expect, afterEach } from "vitest";
import { normalizeBaseUrl } from "./http";

describe("normalizeBaseUrl", () => {
  afterEach(() => {
    delete (globalThis as { __DEV__?: boolean }).__DEV__;
  });

  it("aceita https e tira barras finais", () => {
    expect(normalizeBaseUrl(" https://notas.exemplo.com// ")).toBe("https://notas.exemplo.com");
  });

  it("recusa http fora do dev", () => {
    expect(normalizeBaseUrl("http://10.0.2.2:8787")).toBeNull();
    expect(normalizeBaseUrl("ftp://x")).toBeNull();
    expect(normalizeBaseUrl("")).toBeNull();
  });

  it("aceita http só no dev", () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    expect(normalizeBaseUrl("http://10.0.2.2:8787")).toBe("http://10.0.2.2:8787");
  });
});
