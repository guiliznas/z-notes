import { useSyncExternalStore } from "react";
import { onlineManager, useMutationState } from "@tanstack/react-query";
import { UPDATE_NOTE_KEY } from "@/offline/queryClient";

export function useOnline(): boolean {
  return useSyncExternalStore(
    (cb) => onlineManager.subscribe(cb),
    () => onlineManager.isOnline(),
    () => true,
  );
}

/** Quantidade de autosaves pausados aguardando reconexão. */
export function usePendingSaves(): number {
  const paused = useMutationState({
    filters: { mutationKey: UPDATE_NOTE_KEY, status: "pending" },
    select: (m) => m.state.isPaused,
  });
  return paused.filter(Boolean).length;
}
