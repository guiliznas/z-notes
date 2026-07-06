import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { NoteMeta } from "@z-notes/shared";
import { useSelection } from "@/hooks/useSelection";
import { useNotes, useCreateNote } from "@/hooks/useNotes";
import { useCreateFolder } from "@/hooks/useFolders";
import { useFolders } from "@/hooks/useFolders";
import { useSearch } from "@/hooks/useSearch";
import { notePath, sourceFolderId, type NoteSource } from "@/lib/selection";
import { relativeTime } from "@/lib/time";
import { cn } from "@/lib/cn";
import { IconButton } from "./ui/IconButton";
import { ChevronLeftIcon, FolderIcon, ComposeIcon, SearchIcon, CloseIcon } from "./icons";

interface Props {
  onBack?: () => void;
  onOpenFolders?: () => void;
}

const TITLES: Record<string, string> = { all: "Todas as notas", archived: "Arquivadas", trash: "Lixeira" };

export function NoteList({ onBack, onOpenFolders }: Props) {
  const { source, noteId } = useSelection();
  const navigate = useNavigate();
  const folders = useFolders();
  const notes = useNotes(source);
  const createNote = useCreateNote();
  const createFolder = useCreateFolder();
  const [query, setQuery] = useState("");
  const searchInput = useRef<HTMLInputElement>(null);
  const search = useSearch(query, sourceFolderId(source));

  const canSearch = source.kind !== "trash";
  const canCreate = source.kind === "all" || source.kind === "folder";
  const title = source.kind === "folder" ? folderName(folders.data, source.folderId) : TITLES[source.kind];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInput.current?.focus();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n" && canCreate) {
        e.preventDefault();
        handleCreate();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, folders.data]);

  useEffect(() => setQuery(""), [source.kind, sourceFolderId(source)]);

  const openNote = (id: number) => navigate(notePath(source, id));

  const handleCreate = () => {
    const targetId = source.kind === "folder" ? source.folderId : folders.data?.[0]?.id ?? null;
    if (targetId !== null) {
      createNote.mutate(targetId, { onSuccess: (note) => openNote(note.id) });
      return;
    }
    createFolder.mutate(
      { name: "Notas" },
      { onSuccess: (folder) => createNote.mutate(folder.id, { onSuccess: (note) => openNote(note.id) }) },
    );
  };

  const searching = canSearch && query.trim().length > 0;
  const items = searching ? (search.data ?? []).map((h) => h.note) : notes.data ?? [];
  const snippets = new Map((search.data ?? []).map((h) => [h.note.id, h.snippet]));

  return (
    <div className="flex h-full flex-col bg-[var(--surface)]">
      <header className="flex items-center gap-1 px-2 pt-3 pb-1">
        {onBack && (
          <IconButton label="Voltar para pastas" onClick={onBack}>
            <ChevronLeftIcon />
          </IconButton>
        )}
        {onOpenFolders && (
          <IconButton label="Abrir pastas" onClick={onOpenFolders}>
            <FolderIcon />
          </IconButton>
        )}
        <h1 className="flex-1 truncate px-2 text-lg font-bold">{title}</h1>
        {canCreate && (
          <IconButton label="Nova nota" onClick={handleCreate}>
            <ComposeIcon />
          </IconButton>
        )}
      </header>

      {canSearch && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 rounded-lg bg-[var(--surface-2)] px-3 py-1.5 text-sm text-[var(--muted)]">
            <SearchIcon />
            <input
              ref={searchInput}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar"
              className="w-full bg-transparent text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
            />
            {query && (
              <button aria-label="Limpar busca" onClick={() => setQuery("")} className="text-[var(--muted)]">
                <CloseIcon />
              </button>
            )}
          </div>
        </div>
      )}

      <ul className="flex-1 overflow-y-auto px-2 pb-3">
        {items.length === 0 ? (
          <EmptyState searching={searching} kind={source.kind} />
        ) : (
          items.map((note) => (
            <NoteRow
              key={note.id}
              note={note}
              active={note.id === noteId}
              snippet={snippets.get(note.id)}
              onClick={() => openNote(note.id)}
            />
          ))
        )}
      </ul>
    </div>
  );
}

function folderName(
  folders: { id: number; name: string; children: { id: number; name: string }[] }[] | undefined,
  id: number,
): string {
  if (!folders) return "";
  for (const root of folders) {
    if (root.id === id) return root.name;
    const child = root.children.find((c) => c.id === id);
    if (child) return child.name;
  }
  return "";
}

interface RowProps {
  note: NoteMeta;
  active: boolean;
  snippet?: string;
  onClick: () => void;
}

function NoteRow({ note, active, snippet, onClick }: RowProps) {
  return (
    <li>
      <button
        onClick={onClick}
        className={cn(
          "w-full rounded-lg px-3 py-2.5 text-left",
          active ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--surface-hover)]",
        )}
      >
        <div className="flex items-center gap-2">
          <span className="flex-1 truncate text-sm font-semibold">{note.title}</span>
          {note.archived && <span className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] text-[var(--muted)]">arquivada</span>}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--muted)]">
          <span className="shrink-0">{relativeTime(note.updatedAt)}</span>
          <span className="truncate">{snippet ? <Snippet text={snippet} /> : note.excerpt || "Sem texto adicional"}</span>
        </div>
      </button>
    </li>
  );
}

function Snippet({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]*\])/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("[") && p.endsWith("]") ? (
          <mark key={i} className="mark-hit">
            {p.slice(1, -1)}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function EmptyState({ searching, kind }: { searching: boolean; kind: NoteSource["kind"] }) {
  const message = searching
    ? "Nenhuma nota encontrada."
    : kind === "trash"
      ? "A lixeira está vazia."
      : kind === "archived"
        ? "Nenhuma nota arquivada."
        : "Nenhuma nota aqui ainda.";
  return <li className="px-3 py-10 text-center text-sm text-[var(--muted)]">{message}</li>;
}
