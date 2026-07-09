import "@testing-library/jest-dom/vitest";

// Garante um localStorage funcional quando o ambiente jsdom não provisiona um completo.
if (!globalThis.localStorage || typeof localStorage.setItem !== "function") {
  const store = new Map<string, string>();
  const ls = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => { store.clear(); },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; },
  };
  Object.defineProperty(globalThis, "localStorage", { value: ls, configurable: true, writable: true });
}

