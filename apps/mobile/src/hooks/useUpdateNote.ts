import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Note } from "@z-notes/shared";
import { updateNote } from "../api/resources";
import { UPDATE_NOTE_KEY, type UpdateNoteVars } from "../lib/queryClient";
import { FOLDERS_KEY } from "./useFolders";

export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation<Note, Error, UpdateNoteVars>({
    mutationKey: UPDATE_NOTE_KEY,
    mutationFn: (vars) => updateNote(vars.id, vars),
    onSuccess: (note) => {
      qc.setQueryData(["note", note.id], note);
      qc.invalidateQueries({ queryKey: ["notes"] });
      qc.invalidateQueries({ queryKey: FOLDERS_KEY });
    },
  });
}