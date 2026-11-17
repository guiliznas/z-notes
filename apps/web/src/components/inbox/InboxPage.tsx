import { useState } from "react";
import type { InboxStatusFilter } from "@z-notes/shared";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { OfflineBanner } from "@/components/OfflineBanner";
import { InboxSidebar } from "./InboxSidebar";
import { InboxChatView } from "./InboxChatView";
import { IconButton } from "@/components/ui/IconButton";
import { CloseIcon } from "@/components/icons";

export function InboxPage() {
  const [filter, setFilter] = useState<InboxStatusFilter>("pending");
  const bp = useBreakpoint();

  return (
    <div className="flex h-full flex-col">
      <OfflineBanner />
      <div className="min-h-0 flex-1">
        {bp === "desktop" ? (
          <DesktopLayout filter={filter} onSelectFilter={setFilter} />
        ) : bp === "tablet" ? (
          <TabletLayout filter={filter} onSelectFilter={setFilter} />
        ) : (
          <MobileLayout filter={filter} onSelectFilter={setFilter} />
        )}
      </div>
    </div>
  );
}

function DesktopLayout({
  filter,
  onSelectFilter,
}: {
  filter: InboxStatusFilter;
  onSelectFilter: (f: InboxStatusFilter) => void;
}) {
  return (
    <div className="flex h-full">
      <aside className="w-60 shrink-0 border-r border-[var(--border)]">
        <InboxSidebar currentFilter={filter} onSelectFilter={onSelectFilter} />
      </aside>
      <section className="min-w-0 flex-1">
        <InboxChatView currentFilter={filter} onSelectFilter={onSelectFilter} />
      </section>
    </div>
  );
}

function TabletLayout({
  filter,
  onSelectFilter,
}: {
  filter: InboxStatusFilter;
  onSelectFilter: (f: InboxStatusFilter) => void;
}) {
  const [drawer, setDrawer] = useState(false);

  return (
    <div className="flex h-full">
      {drawer && (
        <div className="fixed inset-0 z-30 flex" onMouseDown={() => setDrawer(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <aside
            className="relative w-72 border-r border-[var(--border)] shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="absolute right-1 top-1 z-10">
              <IconButton label="Fechar menu" onClick={() => setDrawer(false)}>
                <CloseIcon />
              </IconButton>
            </div>
            <InboxSidebar
              currentFilter={filter}
              onSelectFilter={(f) => {
                onSelectFilter(f);
                setDrawer(false);
              }}
            />
          </aside>
        </div>
      )}
      <aside className="hidden w-60 shrink-0 border-r border-[var(--border)] md:block">
        <InboxSidebar currentFilter={filter} onSelectFilter={onSelectFilter} />
      </aside>
      <section className="min-w-0 flex-1">
        <InboxChatView
          currentFilter={filter}
          onSelectFilter={onSelectFilter}
          onOpenSidebar={() => setDrawer(true)}
        />
      </section>
    </div>
  );
}

function MobileLayout({
  filter,
  onSelectFilter,
}: {
  filter: InboxStatusFilter;
  onSelectFilter: (f: InboxStatusFilter) => void;
}) {
  const [drawer, setDrawer] = useState(false);

  return (
    <div className="h-full">
      {drawer && (
        <div className="fixed inset-0 z-30 flex" onMouseDown={() => setDrawer(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <aside
            className="relative w-72 border-r border-[var(--border)] shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="absolute right-1 top-1 z-10">
              <IconButton label="Fechar menu" onClick={() => setDrawer(false)}>
                <CloseIcon />
              </IconButton>
            </div>
            <InboxSidebar
              currentFilter={filter}
              onSelectFilter={(f) => {
                onSelectFilter(f);
                setDrawer(false);
              }}
            />
          </aside>
        </div>
      )}
      <InboxChatView
        currentFilter={filter}
        onSelectFilter={onSelectFilter}
        onOpenSidebar={() => setDrawer(true)}
      />
    </div>
  );
}
