import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useFolders } from "@/hooks/useFolders";
import { FolderIcon, CheckIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

export const LAST_NOTE_FOLDER_KEY = "znotes_inbox_last_note_folder_id";

interface Props {
  open: boolean;
  itemId: number;
  onConfirm: (folderId: number) => void;
  onClose: () => void;
  isPending?: boolean;
}

export function ConvertToNoteDialog({
  open,
  itemId: _itemId,
  onConfirm,
  onClose,
  isPending = false,
}: Props) {
  const foldersQuery = useFolders();
  const folderTree = foldersQuery.data ?? [];

  const rows: { id: number; name: string; indent: boolean }[] = [];
  for (const root of folderTree) {
    rows.push({ id: root.id, name: root.name, indent: false });
    for (const child of root.children) {
      rows.push({ id: child.id, name: child.name, indent: true });
    }
  }

  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(() => {
    const saved = localStorage.getItem(LAST_NOTE_FOLDER_KEY);
    return saved ? Number(saved) : null;
  });

  useEffect(() => {
    if (rows.length > 0) {
      if (!selectedFolderId || !rows.some((r) => r.id === selectedFolderId)) {
        setSelectedFolderId(rows[0].id);
      }
    }
  }, [rows, selectedFolderId]);

  if (!open) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedFolderId) return;

    localStorage.setItem(LAST_NOTE_FOLDER_KEY, String(selectedFolderId));
    onConfirm(selectedFolderId);
  };

  return (
    <Modal
      title="Virar nota"
      onClose={onClose}
      footer={
        <>
          <Button type="button" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            disabled={!selectedFolderId || isPending}
          >
            {isPending ? "Criando nota…" : "Virar nota"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <p className="text-xs text-[var(--muted)]">
          A primeira linha da mensagem se tornará o título da nota e o restante do conteúdo será aberto no editor. Escolha a pasta de destino:
        </p>

        {rows.length === 0 ? (
          <p className="py-4 text-center text-sm text-[var(--muted)]">
            Nenhuma pasta de notas encontrada.
          </p>
        ) : (
          <div
            role="radiogroup"
            aria-label="Pasta de destino"
            className="max-h-60 overflow-y-auto flex flex-col gap-1 pr-1"
          >
            {rows.map((row) => {
              const isSelected = selectedFolderId === row.id;
              return (
                <button
                  key={row.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setSelectedFolderId(row.id)}
                  className={cn(
                    "flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition cursor-pointer",
                    isSelected
                      ? "border-[var(--accent)] bg-[var(--accent)]/10 font-medium text-[var(--text)]"
                      : "border-transparent bg-transparent text-[var(--text)] hover:bg-[var(--surface-hover)]",
                    row.indent && "ml-4",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <FolderIcon className="text-[var(--accent)]" />
                    <span>{row.name}</span>
                  </div>
                  {isSelected && (
                    <span className="text-[var(--accent)]">
                      <CheckIcon />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </form>
    </Modal>
  );
}
