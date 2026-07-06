import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Note } from "@z-notes/shared";
import {
  fetchNotes,
  fetchNote,
  createNote,
  trashNote,
  hardDeleteNote,
  restoreNote,
} from "@/api/resources";
import {
  sourceViewFilter,
  sourceFolderId,
  sourceKey,
  type NoteSource,
} from "@/lib/selection";
import { FOLDERS_KEY } from "./useFolders";

export const notesKey = (source: NoteSource) => ["notes", sourceKey(source)] as const;
export const noteKey = (id: number) => ["note", id] as const;

export function useNotes(source: NoteSource) {
  return useQuery({
    queryKey: notesKey(source),
    queryFn: () => fetchNotes({ folderId: sourceFolderId(source), view: sourceViewFilter(source) }),
  });
}

export function useNote(id: number | null) {
  return useQuery({
    queryKey: id !== null ? noteKey(id) : ["note", "none"],
    queryFn: () => fetchNote(id as number),
    enabled: id !== null,
  });
}

function invalidateLists(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["notes"] });
  qc.invalidateQueries({ queryKey: FOLDERS_KEY });
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (folderId: number) => createNote({ folderId }),
    onSuccess: (note) => {
      qc.setQueryData(noteKey(note.id), note);
      invalidateLists(qc);
    },
  });
}

export function useTrashNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => trashNote(id),
    onSuccess: (_r, id) => {
      qc.removeQueries({ queryKey: noteKey(id) });
      invalidateLists(qc);
    },
  });
}

export function useHardDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => hardDeleteNote(id),
    onSuccess: (_r, id) => {
      qc.removeQueries({ queryKey: noteKey(id) });
      invalidateLists(qc);
    },
  });
}

export function useRestoreNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => restoreNote(id),
    onSuccess: (note: Note) => {
      qc.setQueryData(noteKey(note.id), note);
      invalidateLists(qc);
    },
  });
}
