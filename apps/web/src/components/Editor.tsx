import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { deriveTitle } from "@z-notes/shared";
import { ApiError } from "@/api/http";
import { useSelection } from "@/hooks/useSelection";
import { useFolders } from "@/hooks/useFolders";
import { useNote, useTrashNote, useRestoreNote, useHardDeleteNote } from "@/hooks/useNotes";
import { useUpdateNote } from "@/hooks/useUpdateNote";
import { useAutosave } from "@/hooks/useAutosave";
import { useOnline } from "@/hooks/useOnline";
import { useEditMode } from "@/hooks/useEditMode";
import { sourcePath } from "@/lib/selection";
import { cn } from "@/lib/cn";
import { toggleTaskListItem, isTaskListLine } from "@/lib/taskList";
import { useToast } from "./ui/Toast";
import { IconButton } from "./ui/IconButton";
import { Button } from "./ui/Button";
import { Menu } from "./ui/Menu";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { MoveNoteDialog } from "./MoveNoteDialog";
import {
  ChevronLeftIcon,
  MoveIcon,
  ArchiveIcon,
  TrashIcon,
  RestoreIcon,
  NoteIcon,
  PinIcon,
  PinFilledIcon,
} from "./icons";

interface Props {
  onBack?: () => void;
}

export function Editor({ onBack }: Props) {
  const { source, noteId } = useSelection();
  const navigate = useNavigate();
  const { notify } = useToast();
  const online = useOnline();

  const noteQuery = useNote(noteId);
  const note = noteQuery.data;
  const update = useUpdateNote();
  const folders = useFolders();
  const trash = useTrashNote();
  const restore = useRestoreNote();
  const hardDelete = useHardDeleteNote();

  const [dialog, setDialog] = useState<"move" | "delete-forever" | null>(null);
  const versionRef = useRef(0);

  // Ao carregar/trocar a nota, alinha a versão conhecida com a do servidor.
  useEffect(() => {
    if (note) versionRef.current = note.version;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.id]);

  const readOnly = note?.deleted ?? false;

  const commit = (value: string) => {
    if (!note) return;
    update.mutate(
      { id: note.id, contentMd: value, version: versionRef.current },
      {
        onSuccess: (updated) => {
          versionRef.current = updated.version;
        },
        onError: (err) => {
          if (err.status === 409) {
            noteQuery.refetch().then((r) => {
              if (r.data) {
                autosave.replace(r.data.contentMd);
                versionRef.current = r.data.version;
              }
            });
            notify("A nota mudou em outro lugar; recarreguei a versão mais recente.", "error");
          } else if (err.status !== 401) {
            notify("Não foi possível salvar.", "error");
          }
        },
      },
    );
  };

  const autosave = useAutosave({ resetKey: note?.id ?? null, initialContent: note?.contentMd ?? "", commit });
  const editMode = useEditMode(note?.id ?? null);

  // Nota recém-criada (vazia) já abre pronta para digitar; as demais abrem sempre em visualização.
  useEffect(() => {
    if (note && note.contentMd === "" && !note.deleted) editMode.enterEdit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.id]);

  if (noteId === null) return <EmptyEditor />;
  if (noteQuery.isError) {
    const gone = noteQuery.error instanceof ApiError && noteQuery.error.status === 404;
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-[var(--muted)]">
        <p>{gone ? "Nota não encontrada." : "Falha ao carregar a nota."}</p>
        {onBack && (
          <Button variant="subtle" onClick={onBack}>
            Voltar para a lista
          </Button>
        )}
      </div>
    );
  }
  if (!note) return <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">Carregando…</div>;

  const content = autosave.content;
  const title = deriveTitle(content);
  const status = !online && update.isPending ? "offline" : update.isPending ? "saving" : "saved";

  const backToList = () => navigate(sourcePath(source));

  return (
    <div className="flex h-full flex-col bg-[var(--panel)]">
      <header className="flex h-14 shrink-0 items-center gap-1 px-2 md:px-6">
        {onBack && (
          <IconButton label="Voltar" onClick={onBack}>
            <ChevronLeftIcon />
          </IconButton>
        )}
        <span className="hidden min-w-0 truncate px-2 text-sm text-[var(--muted)] sm:inline">
          {folderLabel(folders.data, note.folderId) ?? title}
        </span>
        <SaveIndicator status={status} />
        <span className="flex-1" />
        {!readOnly && <ModeToggle editing={editMode.editing} onEdit={editMode.enterEdit} onView={editMode.exitEdit} />}
        {!readOnly && (
          <IconButton
            label={note.pinned ? "Desafixar nota" : "Fixar nota"}
            onClick={() => update.mutate({ id: note.id, pinned: !note.pinned })}
          >
            {note.pinned ? <PinFilledIcon className="text-[var(--accent)]" /> : <PinIcon />}
          </IconButton>
        )}
        <NoteActions
          readOnly={readOnly}
          archived={note.archived}
          onMove={() => setDialog("move")}
          onToggleArchive={() => update.mutate({ id: note.id, archived: !note.archived })}
          onTrash={() =>
            trash.mutate(note.id, {
              onSuccess: () => {
                notify("Nota movida para a lixeira.");
                backToList();
              },
            })
          }
          onRestore={() =>
            restore.mutate(note.id, {
              onSuccess: () => notify("Nota restaurada.", "success"),
            })
          }
          onDeleteForever={() => setDialog("delete-forever")}
        />
      </header>

      {readOnly && (
        <div className="bg-[var(--surface-2)] px-4 py-2 text-center text-xs text-[var(--muted)]">
          Esta nota está na lixeira. Restaure para editar.
        </div>
      )}

      <div className="flex min-h-0 flex-1">
      <div className="flex min-h-0 w-full max-w-[800px] flex-col">
      {!readOnly && editMode.editing ? (
        <textarea
          value={content}
          onChange={(e) => autosave.setContent(e.target.value)}
          onBlur={editMode.exitEdit}
          onKeyDown={(e) => {
            if (e.key === "Escape") editMode.exitEdit();
          }}
          placeholder="Comece a escrever…"
          spellCheck
          autoFocus
          className="flex-1 resize-none bg-transparent px-5 py-5 text-[15px] leading-[1.7] outline-none placeholder:text-[var(--muted)] md:px-12"
        />
      ) : (
        <div
          data-testid="preview"
          onDoubleClick={() => {
            if (!readOnly) editMode.enterEdit();
          }}
          className="md flex-1 overflow-auto bg-transparent px-5 py-5 md:px-12"
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              input: ({ type, checked, ...props }) => {
                if (type !== "checkbox") return <input type={type} {...props} />;
                return (
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const lines = content.split("\n");
                      const idx = lines.findIndex((l) => isTaskListLine(l));
                      if (idx === -1) return;
                      const updated = toggleTaskListItem(content, idx);
                      autosave.setContent(updated);
                    }}
                  />
                );
              },
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      )}
      </div>
      </div>

      {dialog === "move" && (
        <MoveNoteDialog
          currentFolderId={note.folderId}
          onClose={() => setDialog(null)}
          onMove={(folderId) => {
            update.mutate({ id: note.id, folderId });
            setDialog(null);
          }}
        />
      )}
      {dialog === "delete-forever" && (
        <ConfirmDialog
          title="Excluir definitivamente"
          message="Esta ação não pode ser desfeita. A nota será apagada para sempre."
          confirmLabel="Excluir para sempre"
          onClose={() => setDialog(null)}
          onConfirm={() => {
            hardDelete.mutate(note.id, { onSuccess: backToList });
            setDialog(null);
          }}
        />
      )}
    </div>
  );
}

function SaveIndicator({ status }: { status: "saving" | "saved" | "offline" }) {
  const text = status === "saving" ? "Salvando…" : status === "offline" ? "Offline" : "Salvo";
  return <span className="px-2 text-xs text-[var(--muted)]">{text}</span>;
}

function folderLabel(
  folders: { id: number; name: string; children: { id: number; name: string }[] }[] | undefined,
  id: number | null,
): string | undefined {
  if (!folders || id === null) return undefined;
  for (const root of folders) {
    if (root.id === id) return root.name;
    const child = root.children.find((c) => c.id === id);
    if (child) return `${root.name} / ${child.name}`;
  }
  return undefined;
}

/** Alternância Editar | Visualizar (duplo clique na nota e Esc continuam funcionando). */
function ModeToggle({ editing, onEdit, onView }: { editing: boolean; onEdit: () => void; onView: () => void }) {
  const base = "rounded-md px-3 py-1 text-xs transition";
  const on = "bg-[var(--panel)] font-semibold text-[var(--text)] shadow-sm";
  const off = "text-[var(--muted)] hover:text-[var(--text)]";
  return (
    <div role="group" aria-label="Modo da nota" className="mr-1 flex rounded-[9px] bg-[var(--sidebar)] p-[3px]">
      <button type="button" aria-pressed={editing} onMouseDown={(e) => e.preventDefault()} onClick={onEdit} className={cn(base, editing ? on : off)}>
        Editar
      </button>
      <button type="button" aria-pressed={!editing} onMouseDown={(e) => e.preventDefault()} onClick={onView} className={cn(base, !editing ? on : off)}>
        Visualizar
      </button>
    </div>
  );
}

interface ActionsProps {
  readOnly: boolean;
  archived: boolean;
  onMove: () => void;
  onToggleArchive: () => void;
  onTrash: () => void;
  onRestore: () => void;
  onDeleteForever: () => void;
}

function NoteActions({ readOnly, archived, onMove, onToggleArchive, onTrash, onRestore, onDeleteForever }: ActionsProps) {
  if (readOnly) {
    return (
      <Menu
        label="Ações da nota"
        items={[
          { label: "Restaurar", icon: <RestoreIcon />, onClick: onRestore },
          { label: "Excluir definitivamente", danger: true, icon: <TrashIcon />, onClick: onDeleteForever },
        ]}
      />
    );
  }
  return (
    <Menu
      label="Ações da nota"
      items={[
        { label: "Mover para…", icon: <MoveIcon />, onClick: onMove },
        { label: archived ? "Desarquivar" : "Arquivar", icon: <ArchiveIcon />, onClick: onToggleArchive },
        { label: "Excluir", danger: true, icon: <TrashIcon />, onClick: onTrash },
      ]}
    />
  );
}

function EmptyEditor() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-[var(--panel)] text-[var(--muted)]">
      <NoteIcon className="text-4xl opacity-40" />
      <p className="text-sm">Selecione ou crie uma nota</p>
    </div>
  );
}
