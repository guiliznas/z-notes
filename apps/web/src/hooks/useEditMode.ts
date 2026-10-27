import { useCallback, useEffect, useRef, useState } from "react";

export interface EditMode {
  editing: boolean;
  enterEdit: () => void;
  exitEdit: () => void;
}

export function useEditMode(resetKey?: unknown): EditMode {
  const [editing, setEditing] = useState<boolean>(false);
  const firstRef = useRef(true);

  // Sempre abre em visualização (nada é lembrado entre sessões); trocar de nota volta a visualizar.
  useEffect(() => {
    if (firstRef.current) {
      firstRef.current = false;
      return;
    }
    setEditing(false);
  }, [resetKey]);

  const enterEdit = useCallback(() => {
    setEditing(true);
  }, []);

  const exitEdit = useCallback(() => {
    setEditing(false);
  }, []);

  return { editing, enterEdit, exitEdit };
}
