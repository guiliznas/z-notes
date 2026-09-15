import { useRegisterSW } from "virtual:pwa-register/react";
import { Button } from "./ui/Button";

/** Aviso de nova versão (service worker em espera): atualiza sem travar em cache velho. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;
  return (
    <div
      role="alert"
      className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm shadow-xl"
    >
      <span>Nova versão disponível.</span>
      <Button variant="primary" onClick={() => updateServiceWorker(true)}>
        Atualizar
      </Button>
      <Button variant="ghost" onClick={() => setNeedRefresh(false)}>
        Depois
      </Button>
    </div>
  );
}
