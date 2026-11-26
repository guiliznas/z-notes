import type { ReactNode } from "react";
import type { InboxStatusFilter } from "@z-notes/shared";
import { cn } from "@/lib/cn";
import { useInboxCount } from "@/hooks/useInbox";
import { SectionSwitch } from "@/components/SectionSwitch";
import { SidebarFooter } from "@/components/SidebarFooter";
import { InboxIcon, CheckIcon, ArchiveIcon } from "@/components/icons";

interface Props {
  currentFilter: InboxStatusFilter;
  onSelectFilter: (filter: InboxStatusFilter) => void;
}

export function InboxSidebar({ currentFilter, onSelectFilter }: Props) {
  const { data: inboxCount } = useInboxCount();
  const pendingCount = inboxCount?.count ?? 0;

  return (
    <div className="flex h-full flex-col bg-[var(--sidebar)]">
      <div className="px-3 pt-3">
        <SectionSwitch current="inbox" />
      </div>

      <div className="flex items-center justify-between px-3 pb-1 pt-4">
        <span className="px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
          Filtros
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        <Row
          icon={<InboxIcon />}
          label="Pendentes"
          active={currentFilter === "pending"}
          count={pendingCount > 0 ? pendingCount : undefined}
          onClick={() => onSelectFilter("pending")}
        />
        <Row
          icon={<CheckIcon />}
          label="Processadas"
          active={currentFilter === "resolved"}
          onClick={() => onSelectFilter("resolved")}
        />
        <Row
          icon={<ArchiveIcon />}
          label="Arquivadas"
          active={currentFilter === "archived"}
          onClick={() => onSelectFilter("archived")}
        />
      </nav>

      <SidebarFooter />
    </div>
  );
}

function Row({
  icon,
  label,
  active,
  count,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-[13.5px] transition cursor-pointer",
        active
          ? "bg-[var(--surface-hover)] font-medium text-[var(--text)]"
          : "text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]",
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-[17px] text-[var(--muted)] shrink-0">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      {count !== undefined && (
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-semibold",
            active ? "bg-[var(--accent)] text-black" : "bg-[var(--surface-2)] text-[var(--muted)]",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
