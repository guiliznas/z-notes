import { useCallback, useEffect, useRef, useState } from "react";

interface Options {
  /** identidade da nota carregada (muda quando a nota é trocada/carregada). null enquanto carrega. */
  resetKey: number | null;
  /** conteúdo autoritativo vindo do servidor. */
  initialContent: string;
  /** chamado (debounced) para persistir o conteúdo. */
  commit: (content: string) => void;
  delay?: number;
}

interface Autosave {
  content: string;
  setContent: (value: string) => void;
  /** substitui o conteúdo sem marcar como sujo (ex.: recarregar após conflito). */
  replace: (value: string) => void;
  /** força o salvamento imediato de pendências. */
  flushNow: () => void;
}

const DEFAULT_DELAY = 800;

export function useAutosave({ resetKey, initialContent, commit, delay = DEFAULT_DELAY }: Options): Autosave {
  const [content, setContentState] = useState(initialContent);
  const contentRef = useRef(initialContent);
  const dirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const commitRef = useRef(commit);
  commitRef.current = commit;

  // Sincroniza com o conteúdo do servidor quando ele chega (carga inicial, troca de nota,
  // recarregamento pós-conflito) — nunca sobrescreve edições locais em andamento.
  useEffect(() => {
    if (dirtyRef.current) return;
    setContentState(initialContent);
    contentRef.current = initialContent;
  }, [resetKey, initialContent]);

  // Salva pendências ao trocar de nota / desmontar, usando o commit ligado a ESTA nota
  // (capturado no render em que resetKey passou a valer).
  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current);
      if (dirtyRef.current) {
        dirtyRef.current = false;
        commit(contentRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const flush = useCallback(() => {
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    commitRef.current(contentRef.current);
  }, []);

  const setContent = useCallback(
    (value: string) => {
      setContentState(value);
      contentRef.current = value;
      dirtyRef.current = true;
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, delay);
    },
    [flush, delay],
  );

  const replace = useCallback((value: string) => {
    setContentState(value);
    contentRef.current = value;
    dirtyRef.current = false;
  }, []);

  return { content, setContent, replace, flushNow: flush };
}
