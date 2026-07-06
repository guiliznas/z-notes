import { useLocation, useParams } from "react-router-dom";
import { parseSource, type NoteSource } from "@/lib/selection";

export type Pane = "folders" | "list" | "editor";

export interface Selection {
  source: NoteSource;
  noteId: number | null;
  pane: Pane;
}

export function useSelection(): Selection {
  const location = useLocation();
  const params = useParams();
  const source = parseSource(location.pathname, params.folderId);
  const noteId = params.noteId ? Number(params.noteId) : null;
  const pane: Pane = noteId !== null ? "editor" : location.pathname === "/" ? "folders" : "list";
  return { source, noteId, pane };
}
