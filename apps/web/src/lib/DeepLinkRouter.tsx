import { useEffect, useRef } from "react";
import { useInRouterContext, useNavigate, type NavigateFunction } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { isTauriEnvironment, setToken } from "@/api/http";
import { parseDeepLink, savePendingCapture, dispatchCaptureEvent } from "@/lib/deepLink";

function useDeepLinkHandler(navigate?: NavigateFunction) {
  const { status, refresh } = useAuth();
  const statusRef = useRef(status);
  const refreshRef = useRef(refresh);
  const navigateRef = useRef(navigate);

  statusRef.current = status;
  refreshRef.current = refresh;
  navigateRef.current = navigate;

  useEffect(() => {
    if (!isTauriEnvironment()) return;
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    const handleUrls = (urls: string[] | null | undefined) => {
      if (!urls || urls.length === 0) return;
      for (const url of urls) {
        const action = parseDeepLink(url);
        if (!action) continue;

        if (action.type === "auth") {
          if (action.token) {
            setToken(action.token);
            void refreshRef.current();
          }
        } else if (action.type === "capture") {
          savePendingCapture(action.text);
          if (statusRef.current === "authenticated") {
            navigateRef.current?.("/inbox");
          }
          dispatchCaptureEvent({ text: action.text });
        }
      }
    };

    void import("@tauri-apps/plugin-deep-link").then(async ({ getCurrent, onOpenUrl }) => {
      if (cancelled) return;

      try {
        const initialUrls = await getCurrent();
        if (!cancelled) {
          handleUrls(initialUrls);
        }
      } catch {
        // Ignora erro ao consultar deep link inicial fora de contexto suportado
      }

      if (cancelled) return;

      const off = await onOpenUrl((urls) => {
        if (!cancelled) {
          handleUrls(urls);
        }
      });

      if (cancelled) off();
      else unlisten = off;
    });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);
}

function DeepLinkRouterWithNav() {
  const navigate = useNavigate();
  useDeepLinkHandler(navigate);
  return null;
}

function DeepLinkRouterWithoutNav() {
  useDeepLinkHandler();
  return null;
}

/**
 * Roteador de Deep Links do Tauri (esquema znotes://).
 * Detecta o contexto do Router para navegar com segurança quando disponível.
 */
export function DeepLinkRouter() {
  const inRouter = useInRouterContext();
  if (inRouter) {
    return <DeepLinkRouterWithNav />;
  }
  return <DeepLinkRouterWithoutNav />;
}
