import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
}

export function IconButton({ label, className, children, ...props }: Props) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg text-lg text-[var(--muted)]",
        "hover:bg-[var(--surface-hover)] hover:text-[var(--text)] transition disabled:opacity-40 disabled:pointer-events-none",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
