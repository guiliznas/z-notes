import { useRef, type ChangeEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { importFiles } from "@/api/resources";
import { useAuth } from "@/auth/AuthContext";
import { FOLDERS_KEY } from "@/hooks/useFolders";
import { useToast } from "./ui/Toast";
import { IconButton } from "./ui/IconButton";
import { UploadIcon, DownloadIcon, LogoutIcon } from "./icons";

export function SidebarFooter() {
  const qc = useQueryClient();
  const { notify } = useToast();
  const { logout } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const importMut = useMutation({
    mutationFn: importFiles,
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: FOLDERS_KEY });
      qc.invalidateQueries({ queryKey: ["notes"] });
      notify(`${r.notesImported} nota(s) importada(s).`, "success");
    },
    onError: () => notify("Falha ao importar arquivos.", "error"),
  });

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) importMut.mutate(files);
    e.target.value = "";
  };

  return (
    <div className="flex items-center gap-1 border-t border-[var(--border)] px-3 py-2">
      <input
        ref={fileRef}
        type="file"
        multiple
        accept=".md,.markdown,.txt,.zip"
        className="hidden"
        onChange={onPick}
      />
      <IconButton label="Importar .md ou .zip" onClick={() => fileRef.current?.click()}>
        <UploadIcon />
      </IconButton>
      <a
        href="/api/export"
        download
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-lg text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
        title="Exportar backup (.zip)"
        aria-label="Exportar backup"
      >
        <DownloadIcon />
      </a>
      <div className="flex-1" />
      <IconButton label="Sair" onClick={() => logout()}>
        <LogoutIcon />
      </IconButton>
    </div>
  );
}
