import type { TaskPriority } from "@z-notes/shared";
import { cn } from "@/lib/cn";
import { PRIORITY_BARS, PRIORITY_CHIP_CLASS, PRIORITY_LABEL } from "@/lib/taskPriority";

/** Três barras; as preenchidas dizem o nível, então a prioridade não depende só da cor. */
export function PriorityBars({ priority, size = 11 }: { priority: TaskPriority; size?: number }) {
  const filled = PRIORITY_BARS[priority];
  const bars = [
    { x: 1, y: 7, h: 4 },
    { x: 4.8, y: 4, h: 7 },
    { x: 8.6, y: 1, h: 10 },
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden="true">
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={b.y} width="2.4" height={b.h} rx=".6" fill="currentColor" opacity={i < filled ? 1 : 0.3} />
      ))}
    </svg>
  );
}

export function PriorityChip({ priority, className }: { priority: TaskPriority; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-full pl-1.5 pr-2 text-[11px] font-semibold",
        PRIORITY_CHIP_CLASS[priority],
        className,
      )}
    >
      <PriorityBars priority={priority} />
      {PRIORITY_LABEL[priority]}
    </span>
  );
}
