import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { PublicUser } from "@z-notes/shared";
import { authMe, authLogout } from "@/api/resources";
import { setUnauthorizedHandler } from "@/api/http";
import { clearUserCache } from "@/offline/queryClient";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthValue {
  status: AuthStatus;
  user: PublicUser | null;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<PublicUser | null>(null);

  const refresh = async () => {
    try {
      const r = await authMe();
      if (r.authenticated) {
        setUser(r.user);
        setStatus("authenticated");
      } else {
        setUser(null);
        setStatus("unauthenticated");
      }
    } catch {
      setUser(null);
      setStatus("unauthenticated");
    }
  };

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setStatus("unauthenticated");
    });
    void refresh();
  }, []);

  const logout = async () => {
    const id = user?.id;
    try {
      await authLogout();
    } finally {
      // Isolamento do cache offline: apaga o IndexedDB deste usuário para
      // que a próxima conta na mesma máquina não veja nada dele.
      if (id !== undefined && id !== null) await clearUserCache(id).catch(() => {});
      setUser(null);
      setStatus("unauthenticated");
    }
  };

  return <AuthContext.Provider value={{ status, user, refresh, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
