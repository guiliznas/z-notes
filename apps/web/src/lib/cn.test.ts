import { describe, it, expect } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("junta classes", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("filtra falsy", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });

  it("aceita arrays", () => {
    expect(cn(["a", "b"], "c")).toBe("a b c");
  });

  it("retorna string vazia sem argumentos", () => {
    expect(cn()).toBe("");
  });
});
