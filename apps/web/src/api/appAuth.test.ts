import { describe, it, expect } from "vitest";
import { appLoginUrl, parseAppAuthRedirect } from "./appAuth";

describe("appAuth", () => {
  it("monta a URL do fluxo de app sem barra duplicada", () => {
    expect(appLoginUrl("http://localhost:8787/")).toBe("http://localhost:8787/api/auth/google?client=app");
  });

  it("extrai token e erro do deep link", () => {
    expect(parseAppAuthRedirect("znotes://auth?token=a.b.c")).toEqual({ token: "a.b.c" });
    expect(parseAppAuthRedirect("znotes://auth?error=denied")).toEqual({ error: "denied" });
    expect(parseAppAuthRedirect("znotes://auth")).toBeNull();
  });

  it("ignora URLs de outro esquema ou host", () => {
    expect(parseAppAuthRedirect("https://evil.com/?token=a")).toBeNull();
    expect(parseAppAuthRedirect("znotes://outra?token=a")).toBeNull();
  });
});
