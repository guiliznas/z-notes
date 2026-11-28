import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { PublicUser } from "@z-notes/shared";
import { authMe, authLogout, authDeleteAccount } from "@/api/resources";
import { clearToken, setUnauthorizedHandler } from "@/api/http";
import { clearUserCache } from "@/offline/queryClient";
import { DeepLinkRouter } from "@/lib/DeepLinkRouter";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthValue {
  status: AuthStatus;
  user: PublicUser | null;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: (onBeforeSignOut?: () => Promise<void> | void) => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<PublicUser | null>(null);

  const refresh = async () => {
    try {
      const data = await authMe();
      if (data.authenticated && data.user) {
        setUser(data.user);
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
      clearToken();
      // Isolamento do cache offline: apaga o IndexedDB deste usuário para
      // que a próxima conta na mesma máquina não veja nada dele.
      if (id !== undefined && id !== null) await clearUserCache(id).catch(() => {});
      setUser(null);
      setStatus("unauthenticated");
    }
  };

  const deleteAccount = async (onBeforeSignOut?: () => Promise<void> | void) => {
    const id = user?.id;
    await authDeleteAccount();
    clearToken();
    if (id !== undefined && id !== null) await clearUserCache(id).catch(() => {});
    await onBeforeSignOut?.();
    setUser(null);
    setStatus("unauthenticated");
  };

  return (
    <AuthContext.Provider value={{ status, user, refresh, logout, deleteAccount }}>
      <DeepLinkRouter />
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
