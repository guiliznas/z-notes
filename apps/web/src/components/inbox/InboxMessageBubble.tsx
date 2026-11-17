import { useState } from "react";
import type { InboxItem } from "@z-notes/shared";
import { formatMessageTime, parseLinksInText } from "@/lib/inbox";
import { cn } from "@/lib/cn";
import type { FailedInboxItem } from "@/hooks/useInbox";

interface Props {
  item: InboxItem;
  failed?: FailedInboxItem;
  onRetry?: () => void;
}

export function InboxMessageBubble({ item, failed, onRetry }: Props) {
  const [copied, setCopied] = useState(false);
  const isSending = item.id < 0 && !failed;
  const segments = parseLinksInText(item.content);

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(item.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-2xl px-4 py-3 shadow-xs transition",
        "max-w-[85%] sm:max-w-[70%]",
        failed
          ? "border border-[var(--danger)] bg-[var(--surface)] text-[var(--text)]"
          : isSending
            ? "border border-dashed border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"
            : "border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]",
      )}
    >
      <div className="whitespace-pre-wrap break-words text-[14.5px] leading-relaxed">
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

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--muted)]">
        <div className="flex items-center gap-1.5">
          {item.resolvedKind && (
            <span className="rounded-[4px] bg-[var(--surface-2)] px-1.5 py-0.5 font-semibold text-[var(--muted)] uppercase tracking-wider text-[10px]">
              Convertida em {item.resolvedKind === "task" ? "tarefa" : "nota"}
            </span>
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

      {failed && (
        <div className="mt-2.5 flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-2 text-[12px]">
          <span className="font-semibold text-[var(--danger)]">Falha ao enviar</span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="font-medium text-[var(--text)] underline hover:text-[var(--danger)] cursor-pointer"
            >
              Tentar de novo
            </button>
          )}
          <button
            type="button"
            onClick={copyText}
            className="text-[var(--muted)] underline hover:text-[var(--text)] cursor-pointer"
          >
            {copied ? "Copiado!" : "Copiar texto"}
          </button>
        </div>
      )}
    </div>
  );
}
