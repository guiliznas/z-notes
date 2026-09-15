import { useRef, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
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
  const { user, logout } = useAuth();
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
      {user?.isAdmin && (
        <Link
          to="/admin"
          title="Administração"
          aria-label="Administração"
          className="inline-flex h-9 items-center rounded-lg px-2 text-xs text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
        >
          Admin
        </Link>
      )}
      {user && (
        <div className="flex min-w-0 items-center gap-2" title={user.email}>
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="h-7 w-7 rounded-full" referrerPolicy="no-referrer" />
          ) : null}
          <span className="max-w-28 truncate text-xs text-[var(--muted)]">{user.name ?? user.email}</span>
        </div>
      )}
      <IconButton label="Sair" onClick={() => logout()}>
        <LogoutIcon />
      </IconButton>
    </div>
  );
}
