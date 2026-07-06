import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Note } from "@z-notes/shared";
import type { ApiError } from "@/api/http";
import { updateNote } from "@/api/resources";
import { UPDATE_NOTE_KEY, type UpdateNoteVars } from "@/offline/queryClient";
import { FOLDERS_KEY } from "./useFolders";
import { noteKey } from "./useNotes";

/** Mutação única para editar conteúdo (autosave), mover e (des)arquivar.
 *  Usa a mutationKey padrão para herdar o comportamento offline-resumível. */
export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation<Note, ApiError, UpdateNoteVars>({
    mutationKey: UPDATE_NOTE_KEY,
    mutationFn: (vars) => updateNote(vars.id, vars),
    onSuccess: (note) => {
      qc.setQueryData(noteKey(note.id), note);
      qc.invalidateQueries({ queryKey: ["notes"] });
      qc.invalidateQueries({ queryKey: FOLDERS_KEY });
    },
  });
}
