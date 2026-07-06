import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { useSelection } from "@/hooks/useSelection";
import { sourcePath } from "@/lib/selection";
import { FolderSidebar } from "./FolderSidebar";
import { NoteList } from "./NoteList";
import { Editor } from "./Editor";
import { OfflineBanner } from "./OfflineBanner";
import { IconButton } from "./ui/IconButton";
import { CloseIcon } from "./icons";

export function NotesPage() {
  const bp = useBreakpoint();
  return (
    <div className="flex h-full flex-col">
      <OfflineBanner />
      <div className="min-h-0 flex-1">
        {bp === "desktop" ? <DesktopLayout /> : bp === "tablet" ? <TabletLayout /> : <MobileLayout />}
      </div>
    </div>
  );
}

function DesktopLayout() {
  return (
    <div className="flex h-full">
      <aside className="w-60 shrink-0 border-r border-[var(--border)]">
        <FolderSidebar />
      </aside>
      <section className="w-80 shrink-0 border-r border-[var(--border)]">
        <NoteList />
      </section>
      <section className="min-w-0 flex-1">
        <Editor />
      </section>
    </div>
  );
}

function TabletLayout() {
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
              <IconButton label="Fechar pastas" onClick={() => setDrawer(false)}>
                <CloseIcon />
              </IconButton>
            </div>
            <FolderSidebar onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      )}
      <section className="w-80 shrink-0 border-r border-[var(--border)]">
        <NoteList onOpenFolders={() => setDrawer(true)} />
      </section>
      <section className="min-w-0 flex-1">
        <Editor />
      </section>
    </div>
  );
}

function MobileLayout() {
  const { source, pane } = useSelection();
  const navigate = useNavigate();

  return (
    <div className="h-full">
      {pane === "editor" ? (
        <Editor onBack={() => navigate(sourcePath(source))} />
      ) : pane === "list" ? (
        <NoteList onBack={() => navigate("/")} />
      ) : (
        <FolderSidebar />
      )}
    </div>
  );
}
