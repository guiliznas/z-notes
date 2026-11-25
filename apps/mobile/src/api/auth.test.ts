import { describe, it, expect } from "vitest";
import { googleLoginUrl, parseAuthRedirect } from "./auth";

describe("googleLoginUrl", () => {
  it("monta a URL do fluxo de app sem barra duplicada", () => {
    expect(googleLoginUrl("https://notes.exemplo.com/")).toBe("https://notes.exemplo.com/api/auth/google?client=app");
  });
});

describe("parseAuthRedirect", () => {
  it("extrai o token", () => {
    expect(parseAuthRedirect("znotes://auth?token=abc.def.ghi")).toEqual({ token: "abc.def.ghi" });
  });
  it("extrai o erro", () => {
    expect(parseAuthRedirect("znotes://auth?error=denied")).toEqual({ error: "denied" });
  });
  it("sem token nem erro vira erro genérico", () => {
    expect(parseAuthRedirect("znotes://auth?x=1")).toEqual({ error: "error" });
  });
  it("ignora URLs que não são do deep link de login", () => {
    expect(parseAuthRedirect("https://evil.com/?token=abc")).toBeNull();
    expect(parseAuthRedirect("znotes://outra?token=abc")).toBeNull();
  });
});
