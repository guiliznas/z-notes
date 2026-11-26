import { describe, it, expect, vi, beforeEach } from "vitest";
import * as http from "../api/http";
import * as resources from "../api/resources";
import * as storage from "./storage";
import { bootSession } from "./bootSession";

const user = { id: 7, email: "a@b.c", name: "A", avatarUrl: null, isAdmin: false };

describe("bootSession", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(http, "loadBaseUrl").mockResolvedValue("https://s.test");
    vi.spyOn(http, "saveCurrentUser").mockResolvedValue();
  });

  it("sem token vai para o login", async () => {
    vi.spyOn(http, "loadToken").mockResolvedValue(null);
    vi.spyOn(http, "loadCurrentUser").mockResolvedValue(null);
    vi.spyOn(http, "loadUserId").mockResolvedValue(null);
    expect((await bootSession()).screen).toBe("login");
  });

  it("401 no authMe limpa token e cache e mostra o login", async () => {
    vi.spyOn(http, "loadToken").mockResolvedValue("jwt");
    vi.spyOn(http, "loadCurrentUser").mockResolvedValue(user);
    vi.spyOn(http, "loadUserId").mockResolvedValue(7);
    vi.spyOn(resources, "authMe").mockRejectedValue(new http.ApiError(401, "unauthorized", "x"));
    const clearToken = vi.spyOn(http, "clearToken").mockResolvedValue();
    const clearCache = vi.spyOn(storage, "clearUserCache").mockResolvedValue();
    const res = await bootSession();
    expect(res).toEqual({ screen: "login", user: null, userId: null });
    expect(clearToken).toHaveBeenCalled();
    expect(clearCache).toHaveBeenCalledWith(7);
  });

  it("erro de rede mantém a sessão offline com o userId guardado", async () => {
    vi.spyOn(http, "loadToken").mockResolvedValue("jwt");
    vi.spyOn(http, "loadCurrentUser").mockResolvedValue(null);
    vi.spyOn(http, "loadUserId").mockResolvedValue(7);
    vi.spyOn(resources, "authMe").mockRejectedValue(new TypeError("Network request failed"));
    const clearToken = vi.spyOn(http, "clearToken").mockResolvedValue();
    const res = await bootSession();
    expect(res).toEqual({ screen: "list", user: null, userId: 7 });
    expect(clearToken).not.toHaveBeenCalled();
  });

  it("authenticated:false limpa a sessão", async () => {
    vi.spyOn(http, "loadToken").mockResolvedValue("jwt");
    vi.spyOn(http, "loadCurrentUser").mockResolvedValue(user);
    vi.spyOn(http, "loadUserId").mockResolvedValue(7);
    vi.spyOn(resources, "authMe").mockResolvedValue({ authenticated: false });
    vi.spyOn(http, "clearToken").mockResolvedValue();
    vi.spyOn(storage, "clearUserCache").mockResolvedValue();
    expect((await bootSession()).screen).toBe("login");
  });

  it("sucesso abre a lista com o usuário", async () => {
    vi.spyOn(http, "loadToken").mockResolvedValue("jwt");
    vi.spyOn(http, "loadCurrentUser").mockResolvedValue(null);
    vi.spyOn(http, "loadUserId").mockResolvedValue(null);
    vi.spyOn(resources, "authMe").mockResolvedValue({ authenticated: true, user });
    expect(await bootSession()).toEqual({ screen: "list", user, userId: 7 });
  });
});
