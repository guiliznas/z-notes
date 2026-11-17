import { useEffect, useRef } from "react";
import type { InboxStatusFilter } from "@z-notes/shared";
import { useInbox, useCreateInboxItem } from "@/hooks/useInbox";
import { buildInboxTimeline } from "@/lib/inbox";
import { InboxMessageBubble } from "./InboxMessageBubble";
import { InboxComposer } from "./InboxComposer";
import { InboxIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

interface Props {
  currentFilter: InboxStatusFilter;
  onSelectFilter?: (filter: InboxStatusFilter) => void;
  onOpenSidebar?: () => void;
}

export function InboxChatView({ currentFilter, onSelectFilter, onOpenSidebar }: Props) {
  const {
    items,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInbox(currentFilter);

  const createItem = useCreateInboxItem();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isInitialScrollRef = useRef(true);

  // Agrupa mensagens cronologicamente com separadores de dia
  const timeline = buildInboxTimeline(items);

  // Rola até o final ao abrir e ao receber/enviar nova mensagem
  useEffect(() => {
    if (items.length > 0) {
      if (isInitialScrollRef.current) {
        bottomRef.current?.scrollIntoView({ behavior: "instant" });
        isInitialScrollRef.current = false;
      } else {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [items.length]);

  const handleSend = (content: string) => {
    const clientId = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `c-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    createItem.mutate({
      clientId,
      content,
      source: "app",
      capturedAt: Date.now(),
    });
  };

  const filterLabels: Record<InboxStatusFilter, string> = {
    pending: "Pendentes",
    resolved: "Processadas",
    archived: "Arquivadas",
  };

  return (
    <div className="flex h-full flex-col bg-[var(--bg)]">
      {/* Cabeçalho */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4">
        <div className="flex items-center gap-3">
          {onOpenSidebar && (
            <button
              type="button"
              onClick={onOpenSidebar}
              aria-label="Abrir menu"
              className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-hover)] cursor-pointer"
            >
              <InboxIcon />
            </button>
          )}
          <div>
            <h1 className="text-[16px] font-semibold text-[var(--text)]">
              Inbox <span className="text-[13px] font-normal text-[var(--muted)]">· {filterLabels[currentFilter]}</span>
            </h1>
          </div>
        </div>

        {/* Alternador rápido de filtro no cabeçalho (visível especialmente em telas menores) */}
        {onSelectFilter && (
          <div role="group" aria-label="Filtro do Inbox" className="flex rounded-lg bg-[var(--surface-hover)] p-0.5 text-[12px]">
            {(["pending", "resolved", "archived"] as const).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={currentFilter === f}
                onClick={() => onSelectFilter(f)}
                className={cn(
                  "rounded-md px-2.5 py-1 font-medium transition cursor-pointer",
                  currentFilter === f
                    ? "bg-[var(--surface)] text-[var(--text)] shadow-xs"
                    : "text-[var(--muted)] hover:text-[var(--text)]",
                )}
              >
                {filterLabels[f]}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Área da conversa / histórico de mensagens */}
      <div
        ref={scrollContainerRef}
        aria-live="polite"
        className="flex-1 overflow-y-auto p-4 sm:p-6"
      >
        <div className="mx-auto flex max-w-4xl flex-col gap-3">
          {/* Botão de carregar mensagens anteriores (paginação por cursor) */}
          {hasNextPage && (
            <div className="flex justify-center pb-2">
              <button
                type="button"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-1.5 text-[12px] font-medium text-[var(--muted)] shadow-xs hover:bg-[var(--surface-hover)] hover:text-[var(--text)] cursor-pointer disabled:opacity-50"
              >
                {isFetchingNextPage ? "Carregando anteriores…" : "Carregar mensagens anteriores"}
              </button>
            </div>
          )}

          {isLoading && (
            <div className="flex h-64 items-center justify-center text-sm text-[var(--muted)]">
              Carregando mensagens…
            </div>
          )}

          {isError && (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-[var(--danger)] bg-[var(--surface)] p-6 text-center">
              <p className="text-sm text-[var(--danger)]">
                {error?.message || "Erro ao carregar mensagens."}
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="rounded-lg bg-[var(--surface-2)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] hover:opacity-80 cursor-pointer"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {!isLoading && !isError && items.length === 0 && (
            <div className="flex h-96 flex-col items-center justify-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-hover)] text-2xl text-[var(--muted)] mb-3">
                <InboxIcon />
              </div>
              <h2 className="text-[17px] font-semibold text-[var(--text)]">
                {currentFilter === "pending"
                  ? "Inbox zero"
                  : currentFilter === "resolved"
                    ? "Nenhuma mensagem processada"
                    : "Nenhuma mensagem arquivada"}
              </h2>
              <p className="mt-1 max-w-xs text-[13.5px] text-[var(--muted)]">
                {currentFilter === "pending"
                  ? "Nenhuma mensagem pendente. Use o campo abaixo para capturar pensamentos, links ou tarefas rapidamente."
                  : "Mensagens triadas aparecerão aqui para consulta histórica."}
              </p>
            </div>
          )}

          {/* Renderização das entradas com separadores de dia */}
          {timeline.map((entry) => {
            if (entry.type === "separator") {
              return (
                <div key={entry.id} className="my-3 flex items-center justify-center">
                  <span className="rounded-full bg-[var(--surface-hover)] px-3 py-1 text-[11px] font-medium text-[var(--muted)]">
                    {entry.label}
                  </span>
                </div>
              );
            }

            const failed = createItem.failedItems.get(entry.item.clientId);
            return (
              <div key={entry.item.clientId || entry.item.id} className="flex justify-start">
                <InboxMessageBubble
                  item={entry.item}
                  failed={failed}
                  onRetry={failed ? () => createItem.retryFailed(failed) : undefined}
                />
              </div>
            );
          })}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Composer fixo na base */}
      <InboxComposer onSend={handleSend} />
    </div>
  );
}
