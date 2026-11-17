import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from "react";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { SendIcon } from "@/components/icons";

interface Props {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function InboxComposer({ onSend, disabled }: Props) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  useEffect(() => {
    adjustHeight();
  }, [text]);

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;

    onSend(trimmed);
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // No desktop: Enter envia e Shift+Enter quebra linha.
    // No celular: Enter quebra linha normal e o envio é pelo botão.
    if (!isMobile && e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4"
    >
      <div className="mx-auto flex max-w-4xl items-end gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-1.5 focus-within:border-[var(--accent)] transition">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
          aria-label="Mensagem do Inbox"
          placeholder={
            isMobile
              ? "Escreva uma mensagem…"
              : "Escreva uma mensagem… (Enter envia, Shift+Enter quebra linha)"
          }
          className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent px-3 py-2 text-[14.5px] leading-relaxed text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
        />

        <button
          type="submit"
          aria-label="Enviar mensagem"
          disabled={disabled || !text.trim()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-black transition hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <SendIcon />
        </button>
      </div>
    </form>
  );
}
