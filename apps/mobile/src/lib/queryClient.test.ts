import { describe, it, expect, vi } from "vitest";

vi.mock("../api/resources", () => ({
  updateNote: vi.fn().mockResolvedValue({ id: 1, contentMd: "x", version: 1 }),
}));

import { createQueryClient, UPDATE_NOTE_KEY, type UpdateNoteVars } from "./queryClient";

describe("createQueryClient", () => {
  it("retorna QueryClient configurado", () => {
    const qc = createQueryClient();
    expect(qc).toBeDefined();
  });

  it("configura staleTime de 30s nas queries", () => {
    const qc = createQueryClient();
    expect(qc.getDefaultOptions().queries?.staleTime).toBe(30_000);
  });

  it("configura mutation default para UPDATE_NOTE_KEY", () => {
    const qc = createQueryClient();
    const defaults = qc.getMutationDefaults(UPDATE_NOTE_KEY);
    expect(defaults).toBeDefined();
    expect(typeof defaults.mutationFn).toBe("function");
  });

  it("mutationFn chama updateNote com id e vars", async () => {
    const qc = createQueryClient();
    const { updateNote } = await import("../api/resources");
    const defaults = qc.getMutationDefaults(UPDATE_NOTE_KEY);
    const vars: UpdateNoteVars = { id: 5, contentMd: "x" };
    await defaults.mutationFn?.(vars, undefined as never);
    expect(updateNote).toHaveBeenCalledWith(5, vars);
  });
});

