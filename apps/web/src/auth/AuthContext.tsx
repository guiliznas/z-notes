import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { authMe, authLogin, authLogout } from "@/api/resources";
import { setUnauthorizedHandler } from "@/api/http";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthValue {
  status: AuthStatus;
  login: (password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    setUnauthorizedHandler(() => setStatus("unauthenticated"));
    authMe()
      .then((r) => setStatus(r.authenticated ? "authenticated" : "unauthenticated"))
      .catch(() => setStatus("unauthenticated"));
  }, []);

  const login = async (password: string) => {
    await authLogin(password);
    setStatus("authenticated");
  };

  const logout = async () => {
    await authLogout();
    setStatus("unauthenticated");
  };

  return <AuthContext.Provider value={{ status, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
