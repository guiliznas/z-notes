import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { TaskFolderWithCount } from "@z-notes/shared";
import { cn } from "@/lib/cn";
import { TASKS_ARCHIVE_PATH, taskFolderPath, TASKS_ROOT, useTaskSelection } from "@/hooks/useTaskSelection";
import {
  useDeleteTaskFolder,
  useTaskArchive,
  useTaskFolders,
  useCreateTaskFolder,
  useUpdateTaskFolder,
} from "@/hooks/useTasks";
import { useToast } from "../ui/Toast";
import { Menu } from "../ui/Menu";
import { IconButton } from "../ui/IconButton";
import { PromptDialog } from "../ui/PromptDialog";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { ArchiveIcon, BoardIcon, FolderPlusIcon, TrashIcon } from "../icons";
import { SectionSwitch } from "../SectionSwitch";
import { SidebarFooter } from "../SidebarFooter";

type Dialog =
  | { type: "new" }
  | { type: "rename"; folder: TaskFolderWithCount }
  | { type: "delete"; folder: TaskFolderWithCount };

export function TaskSidebar() {
  const selection = useTaskSelection();
  const navigate = useNavigate();
  const { notify } = useToast();
  const folders = useTaskFolders();
  const archive = useTaskArchive();
  const create = useCreateTaskFolder();
  const update = useUpdateTaskFolder();
  const remove = useDeleteTaskFolder();
  const [dialog, setDialog] = useState<Dialog | null>(null);

  const archivedCount = archive.data ? archive.data.folders.length + archive.data.lists.length + archive.data.tasks.length : 0;
  const leaveIfCurrent = (id: number) => {
    if (selection.kind === "folder" && selection.folderId === id) navigate(TASKS_ROOT);
  };

  return (
    <div className="flex h-full flex-col bg-[var(--sidebar)]">
      <div className="px-3 pt-3">
        <SectionSwitch current="tasks" />
      </div>
      <div className="flex items-center justify-between px-3 pb-1 pt-3">
        <span className="px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
          Pastas de tarefas
        </span>
        <IconButton label="Nova pasta de tarefas" onClick={() => setDialog({ type: "new" })}>
          <FolderPlusIcon />
        </IconButton>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        {folders.data?.map((folder) => (
          <Row
            key={folder.id}
            icon={<BoardIcon />}
            label={folder.name}
            count={folder.openCount}
            active={selection.kind === "folder" && selection.folderId === folder.id}
            onClick={() => navigate(taskFolderPath(folder.id))}
            menu={
              <Menu
                label={`Ações da pasta ${folder.name}`}
                items={[
                  { label: "Renomear", onClick: () => setDialog({ type: "rename", folder }) },
                  {
                    label: "Arquivar",
                    icon: <ArchiveIcon />,
                    onClick: () =>
                      update.mutate(
                        { id: folder.id, input: { archived: true } },
                        {
                          onSuccess: () => {
                            leaveIfCurrent(folder.id);
                            notify("Pasta arquivada.", "info", {
                              action: {
                                label: "Desfazer",
                                onClick: () => update.mutate({ id: folder.id, input: { archived: false } }),
                              },
                            });
                          },
                        },
                      ),
                  },
                  { label: "Excluir", icon: <TrashIcon />, danger: true, onClick: () => setDialog({ type: "delete", folder }) },
                ]}
              />
            }
          />
        ))}
        {folders.data?.length === 0 && (
          <p className="px-3 py-4 text-sm text-[var(--muted)]">Nenhuma pasta de tarefas ainda.</p>
        )}

        <div className="my-2 border-t border-[var(--border)]" />
        <Row
          icon={<ArchiveIcon />}
          label="Arquivadas"
          count={archivedCount}
          active={selection.kind === "archived"}
          onClick={() => navigate(TASKS_ARCHIVE_PATH)}
        />
      </nav>

      <SidebarFooter />

      {dialog?.type === "new" && (
        <PromptDialog
          title="Nova pasta de tarefas"
          placeholder="Ex.: Lançamento v2"
          confirmLabel="Criar"
          onClose={() => setDialog(null)}
          onConfirm={(name) => {
            create.mutate({ name }, { onSuccess: (folder) => navigate(taskFolderPath(folder.id)) });
            setDialog(null);
          }}
        />
      )}
      {dialog?.type === "rename" && (
        <PromptDialog
          title="Renomear pasta"
          initial={dialog.folder.name}
          confirmLabel="Salvar"
          onClose={() => setDialog(null)}
          onConfirm={(name) => {
            update.mutate({ id: dialog.folder.id, input: { name } });
            setDialog(null);
          }}
        />
      )}
      {dialog?.type === "delete" && (
        <ConfirmDialog
          title="Excluir pasta de tarefas"
          message={`Excluir "${dialog.folder.name}"? As listas e tarefas dela serão apagadas para sempre. Se quiser guardar, arquive a pasta.`}
          confirmLabel="Excluir"
          onClose={() => setDialog(null)}
          onConfirm={() => {
            const id = dialog.folder.id;
            remove.mutate(id, {
              onSuccess: () => {
                leaveIfCurrent(id);
                notify("Pasta excluída.");
              },
              onError: () => notify("Não foi possível excluir a pasta.", "error"),
            });
            setDialog(null);
          }}
        />
      )}
    </div>
  );
}

interface RowProps {
  icon: React.ReactNode;
  label: string;
  count?: number;
  active?: boolean;
  onClick: () => void;
  menu?: React.ReactNode;
}

function Row({ icon, label, count, active, onClick, menu }: RowProps) {
  return (
    <div
      className={cn(
        "group flex items-center gap-1.5 rounded-lg pr-1",
        active ? "bg-[var(--surface-hover)] font-semibold" : "hover:bg-[var(--surface-hover)]",
      )}
    >
      <button onClick={onClick} className="flex min-w-0 flex-1 items-center gap-2 py-1.5 pl-2 text-left text-sm">
        <span className="text-base text-[var(--muted)]">{icon}</span>
        <span className="truncate">{label}</span>
      </button>
      {count !== undefined && count > 0 && (
        <span className={cn("shrink-0 text-xs text-[var(--muted)]", menu && "group-hover:hidden")}>{count}</span>
      )}
      {menu && <span className="shrink-0">{menu}</span>}
    </div>
  );
}
