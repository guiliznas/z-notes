import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { IconButton } from "./IconButton";
import { DotsIcon } from "@/components/icons";

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
}

interface Props {
  items: MenuItem[];
  label: string;
  align?: "left" | "right";
  trigger?: ReactNode;
}

export function Menu({ items, label, align = "right", trigger }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen((o) => !o)}>
        {trigger ?? (
          <IconButton label={label}>
            <DotsIcon />
          </IconButton>
        )}
      </div>
      {open && (
        <ul
          className={cn(
            "absolute z-40 mt-1 min-w-48 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] py-1 shadow-xl",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {items.map((item, i) => (
            <li key={i}>
              <button
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-[var(--surface-hover)]",
                  item.danger ? "text-[var(--danger)]" : "text-[var(--text)]",
                )}
              >
                {item.icon && <span className="text-base">{item.icon}</span>}
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
