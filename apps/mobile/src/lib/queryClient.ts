import { QueryClient } from "@tanstack/react-query";
import { updateNote } from "../api/resources";

const WEEK_MS = 1000 * 60 * 60 * 24 * 7;

export type UpdateNoteVars = { id: number; contentMd?: string; version?: number; folderId?: number; archived?: boolean };
export const UPDATE_NOTE_KEY = ["updateNote"] as const;

export function createQueryClient(): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: WEEK_MS,
        retry: 1,
        networkMode: "offlineFirst",
      },
      mutations: {
        networkMode: "online",
      },
    },
  });

  client.setMutationDefaults(UPDATE_NOTE_KEY, {
    mutationFn: (vars: UpdateNoteVars) => updateNote(vars.id, vars),
  });

  return client;
}