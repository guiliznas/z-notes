import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { PublicUser } from "@z-notes/shared";
import { authMe, authLogout } from "@/api/resources";
import { clearToken, isTauriEnvironment, setToken, setUnauthorizedHandler } from "@/api/http";
import { parseAppAuthRedirect } from "@/api/appAuth";
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

  // App desktop: o login Google roda no navegador do sistema e volta por deep link (znotes://auth?token=...).
  useEffect(() => {
    if (!isTauriEnvironment()) return;
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    void import("@tauri-apps/plugin-deep-link").then(({ onOpenUrl }) =>
      onOpenUrl((urls) => {
        for (const url of urls) {
          const result = parseAppAuthRedirect(url);
          if (result && "token" in result) {
            setToken(result.token);
            void refresh();
          }
        }
      }).then((off) => {
        if (cancelled) off();
        else unlisten = off;
      }),
    );
    return () => {
      cancelled = true;
      unlisten?.();
    };
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

  return <AuthContext.Provider value={{ status, user, refresh, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
