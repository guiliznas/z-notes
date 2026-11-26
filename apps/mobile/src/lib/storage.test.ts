import { describe, it, expect, beforeEach } from "vitest";
import {
  persister,
  persistOptions,
  cacheKeyFor,
  createPersister,
  persistOptionsFor,
  clearUserCache,
} from "./storage";
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

describe("per-user cache isolation", () => {
  it("gera chaves isoladas por userId", () => {
    expect(cacheKeyFor(1)).toBe("z-notes-cache:1");
    expect(cacheKeyFor(2)).toBe("z-notes-cache:2");
    expect(cacheKeyFor()).toBe("z-notes-cache");
  });

  it("isola caches entre dois usuários diferentes", async () => {
    const persisterUser1 = createPersister(1);
    const persisterUser2 = createPersister(2);

    await persisterUser1.persistClient({ user: "Alice", notes: [101] });
    await persisterUser2.persistClient({ user: "Bob", notes: [202] });

    expect(await persisterUser1.restoreClient()).toEqual({ user: "Alice", notes: [101] });
    expect(await persisterUser2.restoreClient()).toEqual({ user: "Bob", notes: [202] });
  });

  it("clearUserCache apaga apenas o cache do usuário especificado", async () => {
    const persisterUser1 = createPersister(1);
    const persisterUser2 = createPersister(2);

    await persisterUser1.persistClient({ user: "Alice" });
    await persisterUser2.persistClient({ user: "Bob" });

    await clearUserCache(1);

    expect(await persisterUser1.restoreClient()).toBeNull();
    expect(await persisterUser2.restoreClient()).toEqual({ user: "Bob" });
  });

  it("persistOptionsFor configura buster v2 e persister dedicado", () => {
    const opts = persistOptionsFor(42);
    expect(opts.buster).toBe("v2");
    expect(opts.persister).toBeDefined();
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
