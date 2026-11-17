import type { TaskPriority } from "@z-notes/shared";

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  none: "Nenhuma",
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

/** Barras preenchidas no ícone: a prioridade não depende só da cor. */
export const PRIORITY_BARS: Record<TaskPriority, number> = { none: 0, low: 1, medium: 2, high: 3 };

export const PRIORITY_CHIP_CLASS: Record<TaskPriority, string> = {
  none: "border border-dashed border-[var(--muted)] text-[var(--muted)]",
  low: "bg-[var(--lo-bg)] text-[var(--lo-fg)]",
  medium: "bg-[var(--md-bg)] text-[var(--md-fg)]",
  high: "bg-[var(--hi-bg)] text-[var(--hi-fg)]",
};
