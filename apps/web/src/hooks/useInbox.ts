import { useContext, useMemo, useState } from "react";
import {
  QueryClient,
  QueryClientContext,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import type {
  ConvertInboxToNoteInput,
  ConvertInboxToTaskInput,
  CreateInboxItemInput,
  InboxCountResponse,
  InboxItem,
  InboxStatusFilter,
  UpdateInboxItemInput,
} from "@z-notes/shared";
import type { ApiError } from "@/api/http";
import {
  convertInboxToNote,
  convertInboxToTask,
  createInboxItem,
  deleteInboxItem,
  fetchInbox,
  fetchInboxCount,
  updateInboxItem,
} from "@/api/resources";
import {
  CREATE_INBOX_ITEM_KEY,
  type CreateInboxItemVars,
} from "@/offline/queryClient";

export const INBOX_KEY = ["inbox"] as const;
export const INBOX_COUNT_KEY = ["inbox-count"] as const;

export const inboxListKey = (status: InboxStatusFilter = "pending") => [...INBOX_KEY, status] as const;

const fallbackClient = new QueryClient();

export function useInboxCount() {
  const client = useContext(QueryClientContext);
  return useQuery(
    {
      queryKey: INBOX_COUNT_KEY,
      queryFn: fetchInboxCount,
      enabled: Boolean(client),
    },
    client ?? fallbackClient,
  );
}

export function useInbox(status: InboxStatusFilter = "pending") {
  const query = useInfiniteQuery({
    queryKey: inboxListKey(status),
    queryFn: ({ pageParam }) => fetchInbox({ status, before: pageParam, limit: 30 }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage || lastPage.length < 30) return undefined;
      return lastPage[lastPage.length - 1].id;
    },
  });

  // A API devolve páginas do mais novo para o mais antigo.
  // Para a visão de chat cronológica, concatenamos e ordenamos de forma crescente (mais antigo em cima, mais novo embaixo).
  const items = useMemo(() => {
    if (!query.data) return [];
    const all: InboxItem[] = [];
    for (const page of query.data.pages) {
      if (Array.isArray(page)) {
        all.push(...page);
      }
    }
    // Remove possíveis duplicidades por clientId ou id
    const seen = new Set<string>();
    const unique: InboxItem[] = [];
    for (const item of all) {
      const key = item.clientId || String(item.id);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }
    return unique.sort((a, b) => a.capturedAt - b.capturedAt || a.id - b.id);
  }, [query.data]);

  return {
    ...query,
    items,
  };
}

export interface FailedInboxItem {
  clientId: string;
  vars: CreateInboxItemVars;
  error: string;
}

export function useCreateInboxItem() {
  const qc = useQueryClient();
  const [failedItems, setFailedItems] = useState<Map<string, FailedInboxItem>>(new Map());

  const mutation = useMutation<
    InboxItem,
    ApiError,
    CreateInboxItemVars,
    { previousData?: unknown; previousCount?: InboxCountResponse }
  >({
    mutationKey: CREATE_INBOX_ITEM_KEY,
    mutationFn: (vars) => createInboxItem(vars),
    onMutate: async (vars) => {
      // Limpa erro prévio desta mensagem se for repetição
      setFailedItems((prev) => {
        if (!prev.has(vars.clientId)) return prev;
        const next = new Map(prev);
        next.delete(vars.clientId);
        return next;
      });

      await qc.cancelQueries({ queryKey: INBOX_KEY });
      await qc.cancelQueries({ queryKey: INBOX_COUNT_KEY });

      const previousData = qc.getQueryData(inboxListKey("pending"));
      const previousCount = qc.getQueryData<InboxCountResponse>(INBOX_COUNT_KEY);

      const now = vars.capturedAt ?? Date.now();
      const optimisticItem: InboxItem = {
        id: -now,
        clientId: vars.clientId,
        content: vars.content,
        source: vars.source ?? "app",
        capturedAt: now,
        archived: false,
        archivedAt: null,
        resolvedKind: null,
        resolvedId: null,
        createdAt: now,
        updatedAt: now,
      };

      // Atualiza cache otimista suportando InfiniteData ou array plano
      qc.setQueryData(inboxListKey("pending"), (old: unknown) => {
        if (!old) {
          return { pages: [[optimisticItem]], pageParams: [undefined] };
        }
        if (Array.isArray(old)) {
          if (old.some((item: InboxItem) => item.clientId === vars.clientId)) return old;
          return [optimisticItem, ...old];
        }
        const inf = old as InfiniteData<InboxItem[]>;
        const firstPage = inf.pages[0] ?? [];
        if (firstPage.some((item: InboxItem) => item.clientId === vars.clientId)) return inf;
        return {
          ...inf,
          pages: [[optimisticItem, ...firstPage], ...inf.pages.slice(1)],
        };
      });

      // Incrementa contagem pendente
      qc.setQueryData<InboxCountResponse>(INBOX_COUNT_KEY, (old) => ({
        count: (old?.count ?? 0) + 1,
      }));

      return { previousData, previousCount };
    },
    onSuccess: (savedItem, vars) => {
      // Substitui item otimista pelo oficial da resposta
      qc.setQueryData(inboxListKey("pending"), (old: unknown) => {
        if (!old) return old;
        if (Array.isArray(old)) {
          return old.map((item: InboxItem) => (item.clientId === vars.clientId ? savedItem : item));
        }
        const inf = old as InfiniteData<InboxItem[]>;
        return {
          ...inf,
          pages: inf.pages.map((page) =>
            page.map((item) => (item.clientId === vars.clientId ? savedItem : item)),
          ),
        };
      });
      qc.invalidateQueries({ queryKey: INBOX_COUNT_KEY });
    },
    onError: (err, vars) => {
      // Falha definitiva (ex.: 400 ou erro de validação): não descartar em silêncio.
      // O item é mantido registrado com opção de tentar de novo e copiar o texto.
      setFailedItems((prev) => {
        const next = new Map(prev);
        next.set(vars.clientId, {
          clientId: vars.clientId,
          vars,
          error: err.message || "Erro ao enviar",
        });
        return next;
      });
    },
  });

  return {
    ...mutation,
    failedItems,
    retryFailed: (failed: FailedInboxItem) => mutation.mutate(failed.vars),
  };
}

export function useArchiveInboxItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, archived }: { id: number; archived: boolean }) =>
      updateInboxItem(id, { archived }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INBOX_KEY });
      qc.invalidateQueries({ queryKey: INBOX_COUNT_KEY });
    },
  });
}

export function useDeleteInboxItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteInboxItem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INBOX_KEY });
      qc.invalidateQueries({ queryKey: INBOX_COUNT_KEY });
    },
  });
}

export function useConvertInboxToTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, listId }: { id: number; listId: number }) =>
      convertInboxToTask(id, { listId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INBOX_KEY });
      qc.invalidateQueries({ queryKey: INBOX_COUNT_KEY });
      qc.invalidateQueries({ queryKey: ["task-folders"] });
      qc.invalidateQueries({ queryKey: ["task-board"] });
    },
  });
}

export function useConvertInboxToNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, folderId }: { id: number; folderId: number }) =>
      convertInboxToNote(id, { folderId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INBOX_KEY });
      qc.invalidateQueries({ queryKey: INBOX_COUNT_KEY });
      qc.invalidateQueries({ queryKey: ["folders"] });
      qc.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}

export function useBatchArchiveInbox() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, archived }: { ids: number[]; archived: boolean }) => {
      await Promise.all(ids.map((id) => updateInboxItem(id, { archived })));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INBOX_KEY });
      qc.invalidateQueries({ queryKey: INBOX_COUNT_KEY });
    },
  });
}

export function useBatchDeleteInbox() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map((id) => deleteInboxItem(id)));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INBOX_KEY });
      qc.invalidateQueries({ queryKey: INBOX_COUNT_KEY });
    },
  });
}

export function useBatchConvertToTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, listId }: { ids: number[]; listId: number }) => {
      for (const id of ids) {
        await convertInboxToTask(id, { listId });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: INBOX_KEY });
      qc.invalidateQueries({ queryKey: INBOX_COUNT_KEY });
      qc.invalidateQueries({ queryKey: ["task-folders"] });
      qc.invalidateQueries({ queryKey: ["task-board"] });
    },
  });
}
