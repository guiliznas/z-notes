import { useEffect, useRef, useState } from "react";
import type { InboxItem } from "@z-notes/shared";
import { formatMessageTime, parseLinksInText } from "@/lib/inbox";
import { cn } from "@/lib/cn";
import type { FailedInboxItem } from "@/hooks/useInbox";
import {
  ArchiveIcon,
  BoardIcon,
  CheckIcon,
  DotsIcon,
  NoteIcon,
  TrashIcon,
} from "@/components/icons";

interface Props {
  item: InboxItem;
  failed?: FailedInboxItem;
  onRetry?: () => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: number) => void;
  onArchive?: (item: InboxItem) => void;
  onConvertToTask?: (item: InboxItem) => void;
  onConvertToNote?: (item: InboxItem) => void;
  onDelete?: (item: InboxItem) => void;
  onNavigateToResolved?: (kind: "task" | "note", id: number) => void;
}

export function InboxMessageBubble({
  item,
  failed,
  onRetry,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
  onArchive,
  onConvertToTask,
  onConvertToNote,
  onDelete,
  onNavigateToResolved,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const isSending = item.id < 0 && !failed;
  const isPending = !item.archived && !item.resolvedKind;
  const segments = parseLinksInText(item.content);

  // Fecha menu de ações ao clicar fora
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(item.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback silencioso
    }
  };

  // Gestos de toque no celular (deslizar para a direita = tarefa, para a esquerda = arquivar)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isSelectionMode || isSending || failed) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    setIsSwiping(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || isSelectionMode || isSending || failed) return;
    const diffX = e.touches[0].clientX - touchStartRef.current.x;
    const diffY = e.touches[0].clientY - touchStartRef.current.y;

    // Se o movimento for mais horizontal do que vertical
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
      setIsSwiping(true);
      // Limita o deslocamento com resistência
      const clamped = Math.max(-110, Math.min(110, diffX));
      setSwipeOffset(clamped);
    }
  };

  const handleTouchEnd = () => {
    if (!touchStartRef.current || isSelectionMode) {
      touchStartRef.current = null;
      setSwipeOffset(0);
      setIsSwiping(false);
      return;
    }

    if (swipeOffset > 60 && onConvertToTask) {
      // Deslizar para a direita -> virar tarefa
      onConvertToTask(item);
    } else if (swipeOffset < -60 && onArchive) {
      // Deslizar para a esquerda -> arquivar
      onArchive(item);
    }

    touchStartRef.current = null;
    setSwipeOffset(0);
    setIsSwiping(false);
  };

  // Atalhos de teclado quando a bolha está em foco
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isSending || failed) return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    if (e.key === "t" && onConvertToTask) {
      e.preventDefault();
      onConvertToTask(item);
    } else if (e.key === "n" && onConvertToNote) {
      e.preventDefault();
      onConvertToNote(item);
    } else if ((e.key === "a" || e.key === "e") && onArchive) {
      e.preventDefault();
      onArchive(item);
    } else if (e.key === "Delete" && onDelete) {
      e.preventDefault();
      onDelete(item);
    }
  };

  return (
    <div
      className={cn(
        "group relative flex w-full select-none items-center gap-2.5 transition",
        isSelectionMode && "cursor-pointer",
      )}
      onClick={isSelectionMode && onToggleSelect ? () => onToggleSelect(item.id) : undefined}
    >
      {/* Checkbox de seleção em lote */}
      {isSelectionMode && (
        <div className="flex shrink-0 items-center justify-center pl-1">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect?.(item.id)}
            aria-label={`Selecionar mensagem "${item.content.slice(0, 30)}"`}
            className="h-4 w-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Contêiner de swipe e bolha */}
      <div className="relative w-full max-w-[90%] sm:max-w-[75%]">
        {/* Fundo revelado durante o gesto de deslizar */}
        {swipeOffset !== 0 && (
          <div
            aria-hidden="true"
            className={cn(
              "absolute inset-0 flex items-center rounded-2xl px-4 text-xs font-semibold text-white transition-opacity",
              swipeOffset > 0
                ? "justify-start bg-emerald-600"
                : "justify-end bg-amber-600",
            )}
          >
            {swipeOffset > 0 ? (
              <span className="flex items-center gap-1.5">
                <BoardIcon /> Virar tarefa
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <ArchiveIcon /> Arquivar
              </span>
            )}
          </div>
        )}

        {/* Bolha da mensagem */}
        <div
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            transform: `translateX(${swipeOffset}px)`,
            transition: isSwiping ? "none" : "transform 0.2s ease-out",
          }}
          className={cn(
            "relative flex flex-col rounded-2xl px-4 py-3 shadow-xs transition outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
            failed
              ? "border border-[var(--danger)] bg-[var(--surface)] text-[var(--text)]"
              : isSending
                ? "border border-dashed border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"
                : isSelected
                  ? "border border-[var(--accent)] bg-[var(--accent)]/5 text-[var(--text)]"
                  : "border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]",
          )}
        >
          {/* Texto com links clicáveis */}
          <div className="whitespace-pre-wrap break-words text-[14.5px] leading-relaxed select-text">
            {segments.map((seg, idx) =>
              seg.type === "link" ? (
                <a
                  key={idx}
                  href={seg.value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[var(--accent)] underline underline-offset-3 hover:opacity-80"
                  onClick={(e) => e.stopPropagation()}
                >
                  {seg.value}
                </a>
              ) : (
                <span key={idx}>{seg.value}</span>
              ),
            )}
          </div>

          {/* Rodapé da bolha: status, badges e horário */}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--muted)]">
            <div className="flex items-center gap-1.5">
              {item.resolvedKind === "task" && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigateToResolved?.("task", item.resolvedId ?? 0);
                  }}
                  className="inline-flex items-center gap-1 rounded-[4px] bg-[var(--surface-2)] px-1.5 py-0.5 font-semibold text-[var(--accent)] hover:underline uppercase tracking-wider text-[10px] cursor-pointer"
                >
                  <BoardIcon />
                  <span>Virou tarefa ›</span>
                </button>
              )}
              {item.resolvedKind === "note" && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigateToResolved?.("note", item.resolvedId ?? 0);
                  }}
                  className="inline-flex items-center gap-1 rounded-[4px] bg-[var(--surface-2)] px-1.5 py-0.5 font-semibold text-[var(--accent)] hover:underline uppercase tracking-wider text-[10px] cursor-pointer"
                >
                  <NoteIcon />
                  <span>Virou nota ›</span>
                </button>
              )}
              {item.archived && !item.resolvedKind && (
                <span className="rounded-[4px] bg-[var(--surface-2)] px-1.5 py-0.5 font-semibold text-[var(--muted)] uppercase tracking-wider text-[10px]">
                  Arquivada
                </span>
              )}
              {isSending && (
                <span className="inline-flex items-center gap-1 font-medium text-[var(--muted)]">
                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--muted)]" />
                  enviando…
                </span>
              )}
            </div>
            <span className="shrink-0">{formatMessageTime(item.capturedAt)}</span>
          </div>

          {/* Tratamento de falhas de envio */}
          {failed && (
            <div className="mt-2.5 flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-2 text-[12px]">
              <span className="font-semibold text-[var(--danger)]">Falha ao enviar</span>
              {onRetry && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRetry();
                  }}
                  className="font-medium text-[var(--text)] underline hover:text-[var(--danger)] cursor-pointer"
                >
                  Tentar de novo
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  copyText();
                }}
                className="text-[var(--muted)] underline hover:text-[var(--text)] cursor-pointer"
              >
                {copied ? "Copiado!" : "Copiar texto"}
              </button>
            </div>
          )}
        </div>

        {/* Botão e Menu de ações (⋯) e botões rápidos */}
        {!isSelectionMode && !isSending && !failed && (
          <div className="absolute right-2 top-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition sm:opacity-0 focus-within:opacity-100">
            {/* Ações rápidas no desktop */}
            {isPending && onConvertToTask && (
              <button
                type="button"
                title="Virar tarefa (t)"
                onClick={(e) => {
                  e.stopPropagation();
                  onConvertToTask(item);
                }}
                className="hidden sm:flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--surface)] text-[var(--muted)] shadow-xs border border-[var(--border)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)] cursor-pointer"
              >
                <BoardIcon />
              </button>
            )}

            {onArchive && (
              <button
                type="button"
                title={item.archived ? "Desarquivar (a)" : "Arquivar (a)"}
                onClick={(e) => {
                  e.stopPropagation();
                  onArchive(item);
                }}
                className="hidden sm:flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--surface)] text-[var(--muted)] shadow-xs border border-[var(--border)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)] cursor-pointer"
              >
                <ArchiveIcon />
              </button>
            )}

            {/* Menu ⋯ com todas as opções */}
            <div ref={menuRef} className="relative">
              <button
                type="button"
                aria-label="Ações da mensagem"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((prev) => !prev);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--surface)] text-[var(--muted)] shadow-xs border border-[var(--border)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)] cursor-pointer"
              >
                <DotsIcon />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-8 z-30 min-w-44 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-100"
                >
                  {isPending && onConvertToTask && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        onConvertToTask(item);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm text-[var(--text)] hover:bg-[var(--surface-hover)] cursor-pointer"
                    >
                      <BoardIcon className="text-[var(--muted)]" />
                      <span>Virar tarefa</span>
                      <span className="ml-auto text-xs text-[var(--muted)]">t</span>
                    </button>
                  )}

                  {isPending && onConvertToNote && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        onConvertToNote(item);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm text-[var(--text)] hover:bg-[var(--surface-hover)] cursor-pointer"
                    >
                      <NoteIcon className="text-[var(--muted)]" />
                      <span>Virar nota</span>
                      <span className="ml-auto text-xs text-[var(--muted)]">n</span>
                    </button>
                  )}

                  {onArchive && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        onArchive(item);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm text-[var(--text)] hover:bg-[var(--surface-hover)] cursor-pointer"
                    >
                      <ArchiveIcon className="text-[var(--muted)]" />
                      <span>{item.archived ? "Desarquivar" : "Arquivar"}</span>
                      <span className="ml-auto text-xs text-[var(--muted)]">a</span>
                    </button>
                  )}

                  <div className="my-1 border-t border-[var(--border)]" />

                  {onDelete && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        onDelete(item);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm text-[var(--danger)] hover:bg-[var(--danger)]/10 cursor-pointer"
                    >
                      <TrashIcon />
                      <span>Excluir</span>
                      <span className="ml-auto text-xs text-[var(--muted)]">Del</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
