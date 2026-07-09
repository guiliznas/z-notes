import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { deriveTitle } from "@z-notes/shared";
import { useSelection } from "@/hooks/useSelection";
import { useNote, useTrashNote, useRestoreNote, useHardDeleteNote } from "@/hooks/useNotes";
import { useUpdateNote } from "@/hooks/useUpdateNote";
import { useAutosave } from "@/hooks/useAutosave";
import { useOnline } from "@/hooks/useOnline";
import { useEditMode } from "@/hooks/useEditMode";
import { sourcePath } from "@/lib/selection";
import { toggleTaskListItem, isTaskListLine } from "@/lib/taskList";
import { useToast } from "./ui/Toast";
import { IconButton } from "./ui/IconButton";
import { Button } from "./ui/Button";
import { Menu } from "./ui/Menu";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { MoveNoteDialog } from "./MoveNoteDialog";
import { ChevronLeftIcon, MoveIcon, ArchiveIcon, TrashIcon, RestoreIcon, NoteIcon } from "./icons";

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

  if (noteId === null) return <EmptyEditor />;
  if (!note) return <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">Carregando…</div>;

  const content = autosave.content;
  const title = deriveTitle(content);
  const status = !online && update.isPending ? "offline" : update.isPending ? "saving" : "saved";

  const backToList = () => navigate(sourcePath(source));

  return (
    <div className="flex h-full flex-col bg-[var(--surface)]">
      <header className="flex items-center gap-1 border-b border-[var(--border)] px-2 py-2">
        {onBack && (
          <IconButton label="Voltar" onClick={onBack}>
            <ChevronLeftIcon />
          </IconButton>
        )}
        <span className="flex-1 truncate px-2 text-sm font-semibold">{title}</span>
        <SaveIndicator status={status} />
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
          className="flex-1 resize-none bg-transparent px-5 py-4 text-[15px] leading-relaxed outline-none placeholder:text-[var(--muted)]"
        />
      ) : (
        <div
          data-testid="preview"
          onDoubleClick={() => {
            if (!readOnly) editMode.enterEdit();
          }}
          className="flex-1 overflow-auto bg-transparent px-5 py-4 text-[15px] leading-relaxed"
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
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-[var(--surface)] text-[var(--muted)]">
      <NoteIcon className="text-4xl opacity-40" />
      <p className="text-sm">Selecione ou crie uma nota</p>
    </div>
  );
}
