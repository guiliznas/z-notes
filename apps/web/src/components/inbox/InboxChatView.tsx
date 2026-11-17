import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import type { InboxItem, InboxStatusFilter } from "@z-notes/shared";
import {
  extractSharePayload,
  normalizeSharePayload,
  hasShareParams,
  getPendingShare,
  clearPendingShare,
} from "@/lib/shareTarget";
import {
  getPendingCapture,
  clearPendingCapture,
  onCaptureEvent,
} from "@/lib/deepLink";
import {
  useInbox,
  useCreateInboxItem,
  useArchiveInboxItem,
  useDeleteInboxItem,
  useConvertInboxToTask,
  useConvertInboxToNote,
  useBatchArchiveInbox,
  useBatchDeleteInbox,
  useBatchConvertToTask,
} from "@/hooks/useInbox";
import { buildInboxTimeline } from "@/lib/inbox";
import { InboxMessageBubble } from "./InboxMessageBubble";
import { InboxComposer } from "./InboxComposer";
import { ConvertToTaskDialog } from "./ConvertToTaskDialog";
import { ConvertToNoteDialog } from "./ConvertToNoteDialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { ArchiveIcon, BoardIcon, CheckIcon, CloseIcon, InboxIcon, TrashIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

interface Props {
  currentFilter: InboxStatusFilter;
  onSelectFilter?: (filter: InboxStatusFilter) => void;
  onOpenSidebar?: () => void;
}

export function InboxChatView({ currentFilter, onSelectFilter, onOpenSidebar }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { notify } = useToast();

  const [prefilledText, setPrefilledText] = useState("");
  const [prefilledSource, setPrefilledSource] = useState<"app" | "share" | "desktop">("app");
  const [composerFocusTrigger, setComposerFocusTrigger] = useState(0);

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
  const archiveItem = useArchiveInboxItem();
  const deleteItem = useDeleteInboxItem();
  const convertToTask = useConvertInboxToTask();
  const convertToNote = useConvertInboxToNote();
  const batchArchive = useBatchArchiveInbox();
  const batchDelete = useBatchDeleteInbox();
  const batchConvertToTask = useBatchConvertToTask();

  // Estados de seleção em lote
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Estados dos modais de ação
  const [taskModalIds, setTaskModalIds] = useState<number[] | null>(null);
  const [noteModalItemId, setNoteModalItemId] = useState<number | null>(null);
  const [deleteModalIds, setDeleteModalIds] = useState<number[] | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isInitialScrollRef = useRef(true);

  // Limpa seleção ao mudar de filtro
  useEffect(() => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  }, [currentFilter]);

  // Agrupa mensagens cronologicamente com separadores de dia
  const timeline = buildInboxTimeline(items);

  // 1. Captura rápida desktop via deep link (znotes://capture ou query params ?capture=1)
  // 2. Receptor do Web Share Target (Android): rota /inbox/share ou parâmetros de busca (title, text, url)
  // Em ambos os casos, pré-preenche o composer sem gravar sozinho e limpa a URL para /inbox
  useEffect(() => {
    // 1. Captura rápida desktop via deep link (znotes://capture ou query params)
    const hasCaptureParam = searchParams.get("capture") !== null;
    const captureTextParam = searchParams.get("text") ?? searchParams.get("content");
    if (hasCaptureParam) {
      if (captureTextParam) {
        setPrefilledText(captureTextParam);
        setPrefilledSource("desktop");
      }
      setComposerFocusTrigger(Date.now());
      clearPendingCapture();
      navigate("/inbox", { replace: true });
      return;
    }

    const pendingCapture = getPendingCapture();
    if (pendingCapture) {
      if (pendingCapture.text) {
        setPrefilledText(pendingCapture.text);
        setPrefilledSource("desktop");
      }
      setComposerFocusTrigger(Date.now());
      clearPendingCapture();
      return;
    }

    // 2. Web Share Target (Android)
    const isShareRoute = location.pathname === "/inbox/share";
    if (isShareRoute || hasShareParams(searchParams)) {
      const payload = extractSharePayload(searchParams);
      const normalized = normalizeSharePayload(payload);
      if (normalized) {
        setPrefilledText(normalized);
        setPrefilledSource("share");
        clearPendingShare();
      }
      navigate("/inbox", { replace: true });
      return;
    }

    const pending = getPendingShare();
    if (pending && pending.content) {
      setPrefilledText(pending.content);
      setPrefilledSource("share");
      clearPendingShare();
      if (isShareRoute) {
        navigate("/inbox", { replace: true });
      }
    }
  }, [location.pathname, searchParams, navigate]);

  // Escuta evento de captura rápida disparado pelo deep link router com o app já aberto
  useEffect(() => {
    const unsubscribe = onCaptureEvent(({ text }) => {
      if (text) {
        setPrefilledText(text);
        setPrefilledSource("desktop");
      }
      setComposerFocusTrigger(Date.now());
    });
    return unsubscribe;
  }, []);

  // Rola até o final ao abrir e ao receber/enviar nova mensagem
  useEffect(() => {
    if (items.length > 0 && typeof bottomRef.current?.scrollIntoView === "function") {
      if (isInitialScrollRef.current) {
        bottomRef.current.scrollIntoView({ behavior: "instant" });
        isInitialScrollRef.current = false;
      } else {
        bottomRef.current.scrollIntoView({ behavior: "smooth" });
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
      source: prefilledSource,
      capturedAt: Date.now(),
    });

    if (prefilledSource === "share" || prefilledSource === "desktop") {
      setPrefilledSource("app");
    }
    setPrefilledText("");
  };

  // Alterna seleção individual
  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Seleciona todas as mensagens visíveis da lista atual
  const handleSelectAll = () => {
    const allIds = items.filter((i) => i.id > 0).map((i) => i.id);
    if (selectedIds.size === allIds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  // Ação de Arquivar / Desarquivar unitária com Desfazer
  const handleArchiveSingle = (item: InboxItem) => {
    const willArchive = !item.archived;
    archiveItem.mutate(
      { id: item.id, archived: willArchive },
      {
        onSuccess: () => {
          notify(
            willArchive ? "Mensagem arquivada" : "Mensagem desarquivada",
            "info",
            willArchive
              ? {
                  action: {
                    label: "Desfazer",
                    onClick: () => archiveItem.mutate({ id: item.id, archived: false }),
                  },
                }
              : undefined,
          );
        },
        onError: (err) => {
          notify(`Erro ao arquivar: ${err.message}`, "error");
        },
      },
    );
  };

  // Ação de Arquivar em lote com Desfazer
  const handleBatchArchive = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    batchArchive.mutate(
      { ids, archived: true },
      {
        onSuccess: () => {
          setIsSelectionMode(false);
          setSelectedIds(new Set());
          notify(`${ids.length} mensagens arquivadas`, "info", {
            action: {
              label: "Desfazer",
              onClick: () => batchArchive.mutate({ ids, archived: false }),
            },
          });
        },
        onError: (err) => {
          notify(`Erro ao arquivar mensagens: ${err.message}`, "error");
        },
      },
    );
  };

  // Confirmar exclusão única ou em lote
  const handleConfirmDelete = () => {
    if (!deleteModalIds || deleteModalIds.length === 0) return;

    const ids = deleteModalIds;
    if (ids.length === 1) {
      deleteItem.mutate(ids[0], {
        onSuccess: () => {
          setDeleteModalIds(null);
          notify("Mensagem excluída", "info");
        },
        onError: (err) => {
          notify(`Erro ao excluir: ${err.message}`, "error");
        },
      });
    } else {
      batchDelete.mutate(ids, {
        onSuccess: () => {
          setDeleteModalIds(null);
          setIsSelectionMode(false);
          setSelectedIds(new Set());
          notify(`${ids.length} mensagens excluídas`, "info");
        },
        onError: (err) => {
          notify(`Erro ao excluir mensagens: ${err.message}`, "error");
        },
      });
    }
  };

  // Confirmar conversão em tarefa (única ou lote)
  const handleConfirmConvertToTask = (listId: number) => {
    if (!taskModalIds || taskModalIds.length === 0) return;

    const ids = taskModalIds;
    if (ids.length === 1) {
      convertToTask.mutate(
        { id: ids[0], listId },
        {
          onSuccess: () => {
            setTaskModalIds(null);
            notify("Mensagem convertida em tarefa", "success");
          },
          onError: (err) => {
            notify(`Erro ao virar tarefa: ${err.message}`, "error");
          },
        },
      );
    } else {
      batchConvertToTask.mutate(
        { ids, listId },
        {
          onSuccess: () => {
            setTaskModalIds(null);
            setIsSelectionMode(false);
            setSelectedIds(new Set());
            notify(`${ids.length} mensagens convertidas em tarefas`, "success");
          },
          onError: (err) => {
            notify(`Erro ao converter em lote: ${err.message}`, "error");
          },
        },
      );
    }
  };

  // Confirmar conversão em nota (única) e abrir nota no editor
  const handleConfirmConvertToNote = (folderId: number) => {
    if (!noteModalItemId) return;
    const id = noteModalItemId;

    convertToNote.mutate(
      { id, folderId },
      {
        onSuccess: (res) => {
          setNoteModalItemId(null);
          notify("Mensagem convertida em nota", "success");
          if (res?.note?.id) {
            navigate(`/folder/${folderId}/note/${res.note.id}`);
          }
        },
        onError: (err) => {
          notify(`Erro ao virar nota: ${err.message}`, "error");
        },
      },
    );
  };

  // Navega para entidade resolvida
  const handleNavigateToResolved = (kind: "task" | "note", id: number) => {
    if (kind === "task") {
      navigate("/tasks");
    } else if (kind === "note") {
      if (id > 0) {
        navigate(`/all/note/${id}`);
      } else {
        navigate("/");
      }
    }
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

        {/* Ferramentas do cabeçalho: Selecionar e Alternador rápido de filtro */}
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <button
              type="button"
              aria-label={isSelectionMode ? "Cancelar seleção" : "Selecionar em lote"}
              onClick={() => {
                setIsSelectionMode((prev) => !prev);
                setSelectedIds(new Set());
              }}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer",
                isSelectionMode
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--text)]",
              )}
            >
              {isSelectionMode ? "Cancelar" : "Selecionar"}
            </button>
          )}

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
        </div>
      </header>

      {/* Barra superior de seleção quando em modo de seleção múltipla */}
      {isSelectionMode && (
        <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-hover)] px-4 py-2 text-xs">
          <div className="flex items-center gap-2 text-[var(--text)] font-medium">
            <span>{selectedIds.size} selecionadas</span>
          </div>
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-[var(--accent)] font-semibold hover:underline cursor-pointer"
          >
            {selectedIds.size === items.length && items.length > 0 ? "Desmarcar todas" : "Selecionar todas"}
          </button>
        </div>
      )}

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
                  isSelectionMode={isSelectionMode}
                  isSelected={selectedIds.has(entry.item.id)}
                  onToggleSelect={handleToggleSelect}
                  onArchive={handleArchiveSingle}
                  onConvertToTask={(item) => setTaskModalIds([item.id])}
                  onConvertToNote={(item) => setNoteModalItemId(item.id)}
                  onDelete={(item) => setDeleteModalIds([item.id])}
                  onNavigateToResolved={handleNavigateToResolved}
                />
              </div>
            );
          })}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Barra flutuante de ações em lote */}
      {isSelectionMode && selectedIds.size > 0 && (
        <div
          role="toolbar"
          aria-label="Ações em lote"
          className="sticky bottom-4 z-40 mx-auto mb-2 flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 shadow-2xl animate-in slide-in-from-bottom-2 duration-150"
        >
          <span className="text-xs font-semibold text-[var(--text)] mr-1">
            {selectedIds.size} selecionadas
          </span>

          <button
            type="button"
            onClick={handleBatchArchive}
            className="flex items-center gap-1.5 rounded-xl bg-[var(--surface-hover)] px-3 py-1.5 text-xs font-medium text-[var(--text)] hover:bg-[var(--border)] transition cursor-pointer"
          >
            <ArchiveIcon />
            <span>Arquivar ({selectedIds.size})</span>
          </button>

          <button
            type="button"
            onClick={() => setTaskModalIds(Array.from(selectedIds))}
            className="flex items-center gap-1.5 rounded-xl bg-[var(--surface-hover)] px-3 py-1.5 text-xs font-medium text-[var(--text)] hover:bg-[var(--border)] transition cursor-pointer"
          >
            <BoardIcon />
            <span>Virar tarefas ({selectedIds.size})</span>
          </button>

          <button
            type="button"
            onClick={() => setDeleteModalIds(Array.from(selectedIds))}
            className="flex items-center gap-1.5 rounded-xl bg-[var(--danger)]/10 px-3 py-1.5 text-xs font-medium text-[var(--danger)] hover:bg-[var(--danger)]/20 transition cursor-pointer"
          >
            <TrashIcon />
            <span>Excluir ({selectedIds.size})</span>
          </button>

          <button
            type="button"
            aria-label="Limpar seleção"
            onClick={() => setSelectedIds(new Set())}
            className="ml-1 flex h-7 w-7 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-hover)] cursor-pointer"
          >
            <CloseIcon />
          </button>
        </div>
      )}

      {/* Composer fixo na base (quando não está no modo de seleção) */}
      {!isSelectionMode && (
        <InboxComposer
          onSend={handleSend}
          initialText={prefilledText}
          disabled={createItem.isPending}
          focusTrigger={composerFocusTrigger}
        />
      )}

      {/* Modal: Virar tarefa (individual ou lote) */}
      {taskModalIds && (
        <ConvertToTaskDialog
          open={Boolean(taskModalIds)}
          itemIds={taskModalIds}
          onConfirm={handleConfirmConvertToTask}
          onClose={() => setTaskModalIds(null)}
          isPending={convertToTask.isPending || batchConvertToTask.isPending}
        />
      )}

      {/* Modal: Virar nota (individual) */}
      {noteModalItemId && (
        <ConvertToNoteDialog
          open={Boolean(noteModalItemId)}
          itemId={noteModalItemId}
          onConfirm={handleConfirmConvertToNote}
          onClose={() => setNoteModalItemId(null)}
          isPending={convertToNote.isPending}
        />
      )}

      {/* Diálogo de confirmação de exclusão */}
      {deleteModalIds && (
        <ConfirmDialog
          title={deleteModalIds.length > 1 ? `Excluir ${deleteModalIds.length} mensagens` : "Excluir mensagem"}
          message={
            deleteModalIds.length > 1
              ? `Tem certeza que deseja excluir ${deleteModalIds.length} mensagens permanentemente? Esta ação não pode ser desfeita.`
              : "Tem certeza que deseja excluir esta mensagem do Inbox permanentemente? Esta ação não pode ser desfeita."
          }
          confirmLabel={deleteModalIds.length > 1 ? `Excluir ${deleteModalIds.length} mensagens` : "Excluir"}
          danger
          onConfirm={handleConfirmDelete}
          onClose={() => setDeleteModalIds(null)}
        />
      )}
    </div>
  );
}
