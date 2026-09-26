import { describe, it, expect, beforeEach } from "vitest";
import { persister, persistOptions } from "./storage";
import { resetStore } from "../test/async-storage-mock";

beforeEach(() => resetStore());

describe("persister", () => {
  it("persistClient + restoreClient roundtrip", async () => {
    const data = { a: 1 };
    await persister.persistClient(data);
    const restored = await persister.restoreClient();
    expect(restored).toEqual(data);
  });

  it("restoreClient retorna null quando vazio", async () => {
    const restored = await persister.restoreClient();
    expect(restored).toBeNull();
  });

  it("removeClient limpa o cache", async () => {
    await persister.persistClient({ x: 1 });
    await persister.removeClient();
    expect(await persister.restoreClient()).toBeNull();
  });
});

describe("persistOptions", () => {
  it("exposicione o persister", () => {
    expect(persistOptions.persister).toBe(persister);
  });

  it("maxAge é 1 semana", () => {
    const weekMs = 1000 * 60 * 60 * 24 * 7;
    expect(persistOptions.maxAge).toBe(weekMs);
  });

  it("buster é v1", () => {
    expect(persistOptions.buster).toBe("v1");
  });
});
