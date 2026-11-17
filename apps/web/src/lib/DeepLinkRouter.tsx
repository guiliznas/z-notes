import { useEffect } from "react";
import { useInRouterContext, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { isTauriEnvironment, setToken } from "@/api/http";
import { parseDeepLink, savePendingCapture, dispatchCaptureEvent } from "@/lib/deepLink";

function DeepLinkRouterWithNav() {
  const navigate = useNavigate();
  const { status, refresh } = useAuth();

  useEffect(() => {
    if (!isTauriEnvironment()) return;
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    void import("@tauri-apps/plugin-deep-link").then(({ onOpenUrl }) =>
      onOpenUrl((urls) => {
        for (const url of urls) {
          const action = parseDeepLink(url);
          if (!action) continue;

          if (action.type === "auth") {
            if (action.token) {
              setToken(action.token);
              void refresh();
            }
          } else if (action.type === "capture") {
            if (status === "unauthenticated") {
              savePendingCapture(action.text);
            } else {
              savePendingCapture(action.text);
              navigate("/inbox");
              dispatchCaptureEvent({ text: action.text });
            }
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
  }, [navigate, status, refresh]);

  return null;
}

function DeepLinkRouterWithoutNav() {
  const { status, refresh } = useAuth();

  useEffect(() => {
    if (!isTauriEnvironment()) return;
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    void import("@tauri-apps/plugin-deep-link").then(({ onOpenUrl }) =>
      onOpenUrl((urls) => {
        for (const url of urls) {
          const action = parseDeepLink(url);
          if (!action) continue;

          if (action.type === "auth") {
            if (action.token) {
              setToken(action.token);
              void refresh();
            }
          } else if (action.type === "capture") {
            savePendingCapture(action.text);
            dispatchCaptureEvent({ text: action.text });
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
  }, [status, refresh]);

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
