import { useMemo, type ReactNode } from "react";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createQueryClient, persistOptionsFor } from "@/offline/queryClient";

/** Providers do app autenticado: QueryClient + cache persistido instanciados por usuário. */
export function PerUserProvider({ userId, children }: { userId: number; children: ReactNode }) {
  const { client, persistOptions } = useMemo(() => {
    const client = createQueryClient();
    return { client, persistOptions: persistOptionsFor(userId) };
  }, [userId]);

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={persistOptions}
      onSuccess={() => client.resumePausedMutations()}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
