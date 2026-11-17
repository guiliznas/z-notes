import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type ToastKind = "info" | "error" | "success";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastOptions {
  /** Botão no aviso (ex.: "Desfazer"). Avisos com ação ficam mais tempo na tela. */
  action?: ToastAction;
  durationMs?: number;
}

interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
  action?: ToastAction;
}

interface ToastValue {
  notify: (message: string, kind?: ToastKind, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);

  const notify = useCallback(
    (message: string, kind: ToastKind = "info", options?: ToastOptions) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, message, kind, action: options?.action }]);
      setTimeout(() => dismiss(id), options?.durationMs ?? (options?.action ? 8000 : 4000));
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex items-center rounded-xl px-4 py-2.5 text-sm text-white shadow-lg",
              t.kind === "error" && "bg-[var(--danger)]",
              t.kind === "success" && "bg-emerald-600",
              t.kind === "info" && "bg-neutral-800",
            )}
          >
            <span>{t.message}</span>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action?.onClick();
                  dismiss(t.id);
                }}
                className="ml-3 rounded-md px-2 py-1 text-sm font-semibold text-[var(--accent)] hover:bg-white/10"
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast deve ser usado dentro de ToastProvider");
  return ctx;
}
