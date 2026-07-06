import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del } from "idb-keyval";
import type { UpdateNoteInput } from "@z-notes/shared";
import { updateNote } from "@/api/resources";

const WEEK_MS = 1000 * 60 * 60 * 24 * 7;

/** Variáveis de uma mutação de autosave — precisam ser serializáveis para resumir após reload. */
export type UpdateNoteVars = { id: number } & UpdateNoteInput;

export const UPDATE_NOTE_KEY = ["updateNote"] as const;

export function createQueryClient(): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: WEEK_MS,
        retry: 1,
        refetchOnWindowFocus: false,
        networkMode: "offlineFirst",
      },
      mutations: {
        networkMode: "online",
      },
    },
  });

  // Autosave resumível: quando offline a mutação é pausada e persistida; ao reconectar/recarregar
  // o React Query a executa novamente usando esta função padrão.
  client.setMutationDefaults(UPDATE_NOTE_KEY, {
    mutationFn: (vars: UpdateNoteVars) => updateNote(vars.id, vars),
  });

  return client;
}

export const persister = createAsyncStoragePersister({
  storage: {
    getItem: (key) => get(key),
    setItem: (key, value) => set(key, value),
    removeItem: (key) => del(key),
  },
  key: "z-notes-cache",
  throttleTime: 1000,
});

export const persistOptions = {
  persister,
  maxAge: WEEK_MS,
  buster: "v1",
};
