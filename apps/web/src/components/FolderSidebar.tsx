import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import type { FolderWithCount } from "@z-notes/shared";
import { useFolders, useCreateFolder, useUpdateFolder, useDeleteFolder } from "@/hooks/useFolders";
import { useSelection } from "@/hooks/useSelection";
import { sourcePath, type NoteSource } from "@/lib/selection";
import { cn } from "@/lib/cn";
import { useToast } from "./ui/Toast";
import { Menu } from "./ui/Menu";
import { IconButton } from "./ui/IconButton";
import { PromptDialog } from "./ui/PromptDialog";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import {
  FolderIcon,
  NoteIcon,
  ArchiveIcon,
  TrashIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  FolderPlusIcon,
} from "./icons";
import { SidebarFooter } from "./SidebarFooter";

interface Props {
  onNavigate?: () => void;
}

type Dialog =
  | { type: "new-root" }
  | { type: "new-sub"; parentId: number }
  | { type: "rename"; id: number; name: string }
  | { type: "delete"; id: number; name: string };

export function FolderSidebar({ onNavigate }: Props) {
  const { source } = useSelection();
  const navigate = useNavigate();
  const { notify } = useToast();
  const folders = useFolders();
  const createFolder = useCreateFolder();
  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [dialog, setDialog] = useState<Dialog | null>(null);

  const go = (s: NoteSource) => {
    navigate(sourcePath(s));
    onNavigate?.();
  };

  const toggleCollapse = (id: number) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const confirmDelete = () => {
    if (dialog?.type !== "delete") return;
    const { id } = dialog;
    deleteFolder.mutate(id, {
      onSuccess: () => {
        notify("Pasta excluída. Notas movidas para a lixeira.");
        if (source.kind === "folder" && source.folderId === id) go({ kind: "all" });
      },
      onError: () => notify("Não foi possível excluir a pasta.", "error"),
    });
    setDialog(null);
  };

  return (
    <div className="flex h-full flex-col bg-[var(--surface-2)]">
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <span className="px-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Pastas</span>
        <IconButton label="Nova pasta" onClick={() => setDialog({ type: "new-root" })}>
          <FolderPlusIcon />
        </IconButton>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        <Row
          icon={<NoteIcon />}
          label="Todas as notas"
          active={source.kind === "all"}
          onClick={() => go({ kind: "all" })}
        />

        {folders.data?.map((folder) => (
          <FolderBranch
            key={folder.id}
            folder={folder}
            source={source}
            collapsed={collapsed.has(folder.id)}
            onToggle={() => toggleCollapse(folder.id)}
            onOpen={(id) => go({ kind: "folder", folderId: id })}
            onNewSub={(parentId) => setDialog({ type: "new-sub", parentId })}
            onRename={(id, name) => setDialog({ type: "rename", id, name })}
            onDelete={(id, name) => setDialog({ type: "delete", id, name })}
          />
        ))}

        <div className="my-2 border-t border-[var(--border)]" />
        <Row
          icon={<ArchiveIcon />}
          label="Arquivadas"
          active={source.kind === "archived"}
          onClick={() => go({ kind: "archived" })}
        />
        <Row
          icon={<TrashIcon />}
          label="Lixeira"
          active={source.kind === "trash"}
          onClick={() => go({ kind: "trash" })}
        />
      </nav>

      <SidebarFooter />

      {dialog?.type === "new-root" && (
        <PromptDialog
          title="Nova pasta"
          placeholder="Nome da pasta"
          confirmLabel="Criar"
          onClose={() => setDialog(null)}
          onConfirm={(name) => {
            createFolder.mutate({ name });
            setDialog(null);
          }}
        />
      )}
      {dialog?.type === "new-sub" && (
        <PromptDialog
          title="Nova subpasta"
          placeholder="Nome da subpasta"
          confirmLabel="Criar"
          onClose={() => setDialog(null)}
          onConfirm={(name) => {
            createFolder.mutate({ name, parentId: dialog.parentId });
            setDialog(null);
          }}
        />
      )}
      {dialog?.type === "rename" && (
        <PromptDialog
          title="Renomear pasta"
          initial={dialog.name}
          confirmLabel="Salvar"
          onClose={() => setDialog(null)}
          onConfirm={(name) => {
            updateFolder.mutate({ id: dialog.id, input: { name } });
            setDialog(null);
          }}
        />
      )}
      {dialog?.type === "delete" && (
        <ConfirmDialog
          title="Excluir pasta"
          message={`Excluir "${dialog.name}"? As notas dela vão para a lixeira.`}
          confirmLabel="Excluir"
          onClose={() => setDialog(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

interface RowProps {
  icon: ReactNode;
  label: string;
  count?: number;
  active?: boolean;
  onClick: () => void;
  indent?: boolean;
  leading?: ReactNode;
  menu?: ReactNode;
}

function Row({ icon, label, count, active, onClick, indent, leading, menu }: RowProps) {
  return (
    <div
      className={cn(
        "group flex items-center gap-1.5 rounded-lg pr-1",
        active ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--surface-hover)]",
        indent && "ml-5",
      )}
    >
      <button onClick={onClick} className="flex min-w-0 flex-1 items-center gap-2 py-1.5 pl-2 text-left text-sm">
        <span className="w-4 shrink-0 text-[var(--muted)]">{leading}</span>
        <span className="text-base text-[var(--accent)]">{icon}</span>
        <span className="truncate">{label}</span>
      </button>
      {count !== undefined && count > 0 && (
        <span className="shrink-0 text-xs text-[var(--muted)] group-hover:hidden">{count}</span>
      )}
      {menu && <span className="shrink-0">{menu}</span>}
    </div>
  );
}

interface BranchProps {
  folder: FolderWithCount & { children?: FolderWithCount[] };
  source: NoteSource;
  collapsed: boolean;
  onToggle: () => void;
  onOpen: (id: number) => void;
  onNewSub: (parentId: number) => void;
  onRename: (id: number, name: string) => void;
  onDelete: (id: number, name: string) => void;
}

function FolderBranch({ folder, source, collapsed, onToggle, onOpen, onNewSub, onRename, onDelete }: BranchProps) {
  const children = folder.children ?? [];
  const hasChildren = children.length > 0;
  const isActive = source.kind === "folder" && source.folderId === folder.id;

  const folderMenu = (id: number, name: string, canAddSub: boolean) => (
    <Menu
      label="Ações da pasta"
      items={[
        ...(canAddSub ? [{ label: "Nova subpasta", icon: <FolderPlusIcon />, onClick: () => onNewSub(id) }] : []),
        { label: "Renomear", onClick: () => onRename(id, name) },
        { label: "Excluir", danger: true, icon: <TrashIcon />, onClick: () => onDelete(id, name) },
      ]}
    />
  );

  return (
    <>
      <Row
        icon={<FolderIcon />}
        label={folder.name}
        count={folder.noteCount}
        active={isActive}
        onClick={() => onOpen(folder.id)}
        leading={
          hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              className="flex h-4 w-4 items-center justify-center text-[var(--muted)]"
              aria-label={collapsed ? "Expandir" : "Recolher"}
            >
              {collapsed ? <ChevronRightIcon /> : <ChevronDownIcon />}
            </button>
          ) : null
        }
        menu={folderMenu(folder.id, folder.name, true)}
      />
      {hasChildren &&
        !collapsed &&
        children.map((child) => (
          <Row
            key={child.id}
            indent
            icon={<FolderIcon />}
            label={child.name}
            count={child.noteCount}
            active={source.kind === "folder" && source.folderId === child.id}
            onClick={() => onOpen(child.id)}
            menu={folderMenu(child.id, child.name, false)}
          />
        ))}
    </>
  );
}
