import { describe, it, expect, vi } from "vitest";
import { createQueryClient, UPDATE_NOTE_KEY } from "./queryClient";

vi.mock("@/api/resources", () => ({
  updateNote: vi.fn(),
}));

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
