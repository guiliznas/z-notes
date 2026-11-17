import { useContext } from "react";
import {
  QueryClient,
  QueryClientContext,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  fetchApiTokens,
  createApiToken,
  revokeApiToken,
  type ApiTokenItem,
  type CreatedApiToken,
} from "@/api/resources";

export const API_TOKENS_KEY = ["api-tokens"] as const;

const fallbackClient = new QueryClient();

export function useApiTokens() {
  const contextClient = useContext(QueryClientContext);
  const client = contextClient ?? fallbackClient;
  const qc = useQueryClient();

  const query = useQuery(
    {
      queryKey: API_TOKENS_KEY,
      queryFn: fetchApiTokens,
      enabled: Boolean(contextClient),
    },
    client,
  );

  const createMut = useMutation(
    {
      mutationFn: (name: string) => createApiToken({ name }),
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: API_TOKENS_KEY });
      },
    },
    client,
  );

  const revokeMut = useMutation(
    {
      mutationFn: (id: number) => revokeApiToken(id),
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: API_TOKENS_KEY });
      },
    },
    client,
  );

  return {
    tokens: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createToken: createMut.mutateAsync,
    isCreating: createMut.isPending,
    revokeToken: revokeMut.mutateAsync,
    isRevoking: revokeMut.isPending,
    refetch: query.refetch,
  };
}
