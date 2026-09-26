import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "z-notes-edit-mode";

function readStored(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "edit";
  } catch {
    return false;
  }
}

export interface EditMode {
  editing: boolean;
  enterEdit: () => void;
  exitEdit: () => void;
}

export function useEditMode(resetKey?: unknown): EditMode {
  const [editing, setEditing] = useState<boolean>(() => readStored());
  const firstRef = useRef(true);

  // Reset para preview ao trocar de nota (pula a primeira montagem).
  useEffect(() => {
    if (firstRef.current) {
      firstRef.current = false;
      return;
    }
    setEditing(false);
  }, [resetKey]);

  const enterEdit = useCallback(() => {
    setEditing(true);
    try {
      localStorage.setItem(STORAGE_KEY, "edit");
    } catch {
      // ignore (modo privado / armazenamento indisponível)
    }
  }, []);

  const exitEdit = useCallback(() => {
    setEditing(false);
    try {
      localStorage.setItem(STORAGE_KEY, "preview");
    } catch {
      // ignore
    }
  }, []);

  return { editing, enterEdit, exitEdit };
}
