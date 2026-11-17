import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  /** 28px em vez de 36px (cartões densos). Variante própria: `cn` não resolve classes conflitantes. */
  compact?: boolean;
}

export function IconButton({ label, compact, className, children, ...props }: Props) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center justify-center rounded-lg text-lg text-[var(--muted)]",
        compact ? "h-7 w-7" : "h-9 w-9",
        "hover:bg-[var(--surface-hover)] hover:text-[var(--text)] transition disabled:opacity-40 disabled:pointer-events-none",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
