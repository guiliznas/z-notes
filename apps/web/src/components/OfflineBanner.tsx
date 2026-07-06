import { useOnline, usePendingSaves } from "@/hooks/useOnline";

export function OfflineBanner() {
  const online = useOnline();
  const pending = usePendingSaves();
  if (online) return null;
  return (
    <div className="bg-[var(--accent)] px-4 py-1.5 text-center text-xs font-medium text-black">
      Offline{pending > 0 ? ` — ${pending} alteração(ões) serão sincronizadas ao reconectar` : ""}
    </div>
  );
}
