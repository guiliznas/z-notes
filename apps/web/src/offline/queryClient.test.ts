import { describe, it, expect, vi } from "vitest";

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
import { cacheKeyFor, clearUserCache } from "./queryClient";

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
