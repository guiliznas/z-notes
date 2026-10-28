import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { taskFolderPath, TASKS_ROOT, useTaskSelection } from "@/hooks/useTaskSelection";
import { useTaskFolders } from "@/hooks/useTasks";
import { OfflineBanner } from "../OfflineBanner";
import { TaskArchiveView } from "./TaskArchiveView";
import { TaskBoard } from "./TaskBoard";
import { TaskSidebar } from "./TaskSidebar";

export function TasksPage() {
  const bp = useBreakpoint();
  return (
    <div className="flex h-full flex-col">
      <OfflineBanner />
      <div className="min-h-0 flex-1">{bp === "mobile" ? <MobileLayout /> : <WideLayout />}</div>
    </div>
  );
}

function Main() {
  const selection = useTaskSelection();
  if (selection.kind === "folder") return <TaskBoard key={selection.folderId} folderId={selection.folderId} />;
  if (selection.kind === "archived") return <TaskArchiveView />;
  return (
    <div className="flex h-full items-center justify-center bg-[var(--panel)] px-6 text-center text-sm text-[var(--muted)]">
      Crie uma pasta de tarefas na barra lateral para começar.
    </div>
  );
}

function WideLayout() {
  const selection = useTaskSelection();
  const navigate = useNavigate();
  const folders = useTaskFolders();

  // Sem pasta escolhida: abre a primeira (a "raiz" /tasks só existe como painel de pastas no celular).
  useEffect(() => {
    if (selection.kind === "none" && folders.data && folders.data.length > 0) {
      navigate(taskFolderPath(folders.data[0].id), { replace: true });
    }
  }, [selection.kind, folders.data, navigate]);

  return (
    <div className="flex h-full">
      <aside className="w-60 shrink-0 border-r border-[var(--border)]">
        <TaskSidebar />
      </aside>
      <section className="min-w-0 flex-1">
        <Main />
      </section>
    </div>
  );
}

function MobileLayout() {
  const selection = useTaskSelection();
  const navigate = useNavigate();
  const back = () => navigate(TASKS_ROOT);

  return (
    <div className="h-full">
      {selection.kind === "folder" ? (
        <TaskBoard key={selection.folderId} folderId={selection.folderId} onBack={back} />
      ) : selection.kind === "archived" ? (
        <TaskArchiveView onBack={back} />
      ) : (
        <TaskSidebar />
      )}
    </div>
  );
}
