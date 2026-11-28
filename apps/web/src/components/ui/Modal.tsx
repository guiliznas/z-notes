import { useEffect, type ReactNode } from "react";
import { IconButton } from "./IconButton";
import { CloseIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** Largura máxima do card. Variante própria: `cn` não resolve classes conflitantes. */
  size?: keyof typeof SIZES;
}

const SIZES = { md: "max-w-md", lg: "max-w-lg" };

export function Modal({ title, onClose, children, footer, size = "md" }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4"
      onMouseDown={onClose}
    >
      <div
        className={cn(
          "flex max-h-[calc(100dvh-2rem)] w-full flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl",
          SIZES[size],
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-5 py-3.5">
          <h2 className="text-base font-semibold">{title}</h2>
          <IconButton label="Fechar" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>
        <div className="min-h-0 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-[var(--border)] px-5 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
