import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "ghost" | "danger" | "subtle";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-[var(--accent)] text-black hover:brightness-105 font-medium",
  ghost: "text-[var(--text)] hover:bg-[var(--surface-hover)]",
  subtle: "bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--surface-hover)]",
  danger: "bg-[var(--danger)] text-white hover:brightness-110 font-medium",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "ghost", className, ...props }: Props) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm transition disabled:opacity-40 disabled:pointer-events-none",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
