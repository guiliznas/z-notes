import { describe, it, expect, vi } from "vitest";
import { createQueryClient, UPDATE_NOTE_KEY, cacheKeyFor, clearUserCache } from "./queryClient";

vi.mock("@/api/resources", () => ({
  updateNote: vi.fn(),
}));

vi.mock("idb-keyval", () => {
  const store = new Map<string, unknown>();
  return {
    get: (key: string) => Promise.resolve(store.get(key)),
    set: (key: string, value: unknown) => {
      store.set(key, value);
      return Promise.resolve();
    },
    del: (key: string) => {
      store.delete(key);
      return Promise.resolve();
    },
  };
});

import { set } from "idb-keyval";

describe("createQueryClient", () => {
  it("cria QueryClient com defaults offline-first", () => {
    const client = createQueryClient();
    const defaults = client.getDefaultOptions();
    expect(defaults.queries?.networkMode).toBe("offlineFirst");
    expect(defaults.queries?.staleTime).toBe(30_000);
    expect(defaults.mutations?.networkMode).toBe("online");
  });

  it("registra mutation defaults para updateNote", () => {
    const client = createQueryClient();
    const defaults = client.getMutationDefaults(UPDATE_NOTE_KEY);
    expect(defaults).toBeDefined();
    expect(typeof defaults?.mutationFn).toBe("function");
  });
});

describe("cache offline por usuário", () => {
  it("chaves diferem por usuário e nunca são globais", () => {
    expect(cacheKeyFor(1)).not.toBe(cacheKeyFor(2));
    expect(cacheKeyFor(1)).toContain("1");
    expect(cacheKeyFor(1)).not.toBe("z-notes-cache");
  });

  it("clearUserCache apaga só a chave do usuário", async () => {
    await set(cacheKeyFor(1), { data: "de-A" });
    await set(cacheKeyFor(2), { data: "de-B" });

    await clearUserCache(1);

    const { get } = await import("idb-keyval");
    expect(await get(cacheKeyFor(1))).toBeUndefined();
    expect(await get(cacheKeyFor(2))).toEqual({ data: "de-B" });
  });
});

