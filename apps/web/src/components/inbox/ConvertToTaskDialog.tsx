import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useTaskFolders, useTaskBoard } from "@/hooks/useTasks";
import { BoardIcon, CheckIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

export const LAST_TASK_FOLDER_KEY = "znotes_inbox_last_task_folder_id";
export const LAST_TASK_LIST_KEY = "znotes_inbox_last_task_list_id";

interface Props {
  open: boolean;
  itemIds: number[];
  onConfirm: (listId: number) => void;
  onClose: () => void;
  isPending?: boolean;
}

export function ConvertToTaskDialog({
  open,
  itemIds,
  onConfirm,
  onClose,
  isPending = false,
}: Props) {
  const foldersQuery = useTaskFolders("active");
  const folders = foldersQuery.data ?? [];

  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(() => {
    const saved = localStorage.getItem(LAST_TASK_FOLDER_KEY);
    return saved ? Number(saved) : null;
  });

  const [selectedListId, setSelectedListId] = useState<number | null>(() => {
    const saved = localStorage.getItem(LAST_TASK_LIST_KEY);
    return saved ? Number(saved) : null;
  });

  // Garante uma pasta selecionada válida quando a lista de pastas carrega
  useEffect(() => {
    if (folders.length > 0) {
      if (!selectedFolderId || !folders.some((f) => f.id === selectedFolderId)) {
        setSelectedFolderId(folders[0].id);
      }
    }
  }, [folders, selectedFolderId]);

  // Carrega o quadro da pasta selecionada para listar suas colunas/listas
  const boardQuery = useTaskBoard(selectedFolderId);
  const lists = boardQuery.data?.lists ?? [];

  // Garante uma lista selecionada válida
  useEffect(() => {
    if (lists.length > 0) {
      if (!selectedListId || !lists.some((l) => l.id === selectedListId)) {
        setSelectedListId(lists[0].id);
      }
    } else {
      setSelectedListId(null);
    }
  }, [lists, selectedListId]);

  if (!open) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedListId) return;

    if (selectedFolderId) {
      localStorage.setItem(LAST_TASK_FOLDER_KEY, String(selectedFolderId));
    }
    localStorage.setItem(LAST_TASK_LIST_KEY, String(selectedListId));

    onConfirm(selectedListId);
  };

  const count = itemIds.length;
  const title = count > 1 ? `Virar tarefas (${count})` : "Virar tarefa";

  return (
    <Modal
      title={title}
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
            disabled={!selectedListId || isPending}
          >
            {isPending ? "Convertendo…" : count > 1 ? `Converter ${count} mensagens` : "Virar tarefa"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {folders.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            Nenhuma pasta de tarefas ativa encontrada. Crie uma pasta de tarefas na seção Tarefas para converter mensagens em tarefas.
          </p>
        ) : (
          <>
            {folders.length > 1 && (
              <div>
                <label htmlFor="task-folder-select" className="mb-1 block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                  Pasta de tarefas
                </label>
                <select
                  id="task-folder-select"
                  value={selectedFolderId ?? ""}
                  onChange={(e) => setSelectedFolderId(Number(e.target.value))}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-hover)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
                >
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                Lista de destino (coluna)
              </label>

              {boardQuery.isLoading ? (
                <div className="py-4 text-center text-sm text-[var(--muted)]">Carregando listas…</div>
              ) : lists.length === 0 ? (
                <p className="py-2 text-sm text-[var(--muted)]">
                  Esta pasta não possui listas ativas. Crie ao menos uma lista para receber tarefas.
                </p>
              ) : (
                <div role="radiogroup" aria-label="Lista de destino" className="flex flex-col gap-1.5">
                  {lists.map((list) => {
                    const isSelected = selectedListId === list.id;
                    return (
                      <button
                        key={list.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => setSelectedListId(list.id)}
                        className={cn(
                          "flex items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition cursor-pointer",
                          isSelected
                            ? "border-[var(--accent)] bg-[var(--accent)]/10 font-medium text-[var(--text)]"
                            : "border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-hover)]",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <BoardIcon className="text-[var(--muted)]" />
                          <span>{list.name}</span>
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
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}
