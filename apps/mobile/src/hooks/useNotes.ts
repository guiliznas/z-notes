import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Note } from "@z-notes/shared";
import {
  fetchNotes, fetchNote, createNote, trashNote, hardDeleteNote, restoreNote,
} from "../api/resources";
import { FOLDERS_KEY } from "./useFolders";

export function useNotes(folderId: number | null, view: "active" | "archived" | "trash" = "active") {
  return useQuery({
    queryKey: ["notes", folderId, view],
    queryFn: () => fetchNotes({ folderId, view }),
  });
}

export function useNote(id: number | null) {
  return useQuery({
    queryKey: ["note", id],
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
      qc.setQueryData(["note", note.id], note);
      invalidateLists(qc);
    },
  });
}

export function useTrashNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => trashNote(id),
    onSuccess: (_r, id) => {
      qc.removeQueries({ queryKey: ["note", id] });
      invalidateLists(qc);
    },
  });
}

export function useHardDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => hardDeleteNote(id),
    onSuccess: (_r, id) => {
      qc.removeQueries({ queryKey: ["note", id] });
      invalidateLists(qc);
    },
  });
}

export function useRestoreNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => restoreNote(id),
    onSuccess: (note: Note) => {
      qc.setQueryData(["note", note.id], note);
      invalidateLists(qc);
    },
  });
}