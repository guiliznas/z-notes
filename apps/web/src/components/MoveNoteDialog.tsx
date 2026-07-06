import { useFolders } from "@/hooks/useFolders";
import { Modal } from "./ui/Modal";
import { FolderIcon } from "./icons";
import { cn } from "@/lib/cn";

interface Props {
  currentFolderId: number | null;
  onMove: (folderId: number) => void;
  onClose: () => void;
}

export function MoveNoteDialog({ currentFolderId, onMove, onClose }: Props) {
  const folders = useFolders();

  const rows: { id: number; name: string; indent: boolean }[] = [];
  for (const root of folders.data ?? []) {
    rows.push({ id: root.id, name: root.name, indent: false });
    for (const child of root.children) rows.push({ id: child.id, name: child.name, indent: true });
  }

  return (
    <Modal title="Mover para" onClose={onClose}>
      <ul className="max-h-80 overflow-y-auto">
        {rows.map((row) => (
          <li key={row.id}>
            <button
              disabled={row.id === currentFolderId}
              onClick={() => onMove(row.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--surface-hover)] disabled:opacity-40",
                row.indent && "pl-8",
              )}
            >
              <span className="text-[var(--accent)]">
                <FolderIcon />
              </span>
              {row.name}
              {row.id === currentFolderId && <span className="ml-auto text-xs text-[var(--muted)]">atual</span>}
            </button>
          </li>
        ))}
        {rows.length === 0 && <li className="px-3 py-6 text-center text-sm text-[var(--muted)]">Nenhuma pasta.</li>}
      </ul>
    </Modal>
  );
}
