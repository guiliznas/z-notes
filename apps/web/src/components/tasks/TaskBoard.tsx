import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Task, TaskListWithTasks } from "@z-notes/shared";
import { ApiError } from "@/api/http";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { TASKS_ROOT } from "@/hooks/useTaskSelection";
import {
  useArchiveCompleted,
  useCreateTask,
  useCreateTaskList,
  useDeleteTask,
  useDeleteTaskFolder,
  useDeleteTaskList,
  useSetTasksArchived,
  useTaskBoard,
  useUpdateTask,
  useUpdateTaskFolder,
  useUpdateTaskList,
} from "@/hooks/useTasks";
import { cn } from "@/lib/cn";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { IconButton } from "../ui/IconButton";
import { Menu } from "../ui/Menu";
import { Modal } from "../ui/Modal";
import { PromptDialog } from "../ui/PromptDialog";
import { useToast } from "../ui/Toast";
import { ArchiveIcon, BoardIcon, ChevronLeftIcon, PlusIcon, TrashIcon } from "../icons";
import type { TaskCardActions } from "./TaskCard";
import { TaskColumn, type ColumnActions } from "./TaskColumn";
import { TaskDnd } from "./TaskDnd";

type Dialog =
  | { type: "new-list" }
  | { type: "rename-list"; list: TaskListWithTasks }
  | { type: "delete-list"; list: TaskListWithTasks }
  | { type: "rename-folder" }
  | { type: "delete-folder" }
  | { type: "move-task"; task: Task }
  | { type: "delete-task"; task: Task };

interface Props {
  folderId: number;
  onBack?: () => void;
}

export function TaskBoard({ folderId, onBack }: Props) {
  const bp = useBreakpoint();
  const navigate = useNavigate();
  const { notify } = useToast();
  const boardQuery = useTaskBoard(folderId);
  const createList = useCreateTaskList();
  const createTask = useCreateTask();
  const updateList = useUpdateTaskList();
  const deleteList = useDeleteTaskList();
  const updateFolder = useUpdateTaskFolder();
  const deleteFolder = useDeleteTaskFolder();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const archiveCompleted = useArchiveCompleted();
  const setArchived = useSetTasksArchived();

  const [sortedByPriority, setSortedByPriority] = useState(false);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [activeTab, setActiveTab] = useState<number | null>(null);

  const board = boardQuery.data;
  if (boardQuery.isError) {
    const gone = boardQuery.error instanceof ApiError && boardQuery.error.status === 404;
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-[var(--panel)] text-sm text-[var(--muted)]">
        <p>{gone ? "Pasta de tarefas não encontrada." : "Falha ao carregar o quadro."}</p>
        <Button variant="subtle" onClick={() => navigate(TASKS_ROOT)}>
          Voltar
        </Button>
      </div>
    );
  }
  if (!board) {
    return <div className="flex h-full items-center justify-center bg-[var(--panel)] text-sm text-[var(--muted)]">Carregando…</div>;
  }

  const fail = () => notify("Não foi possível concluir a ação. Tente de novo.", "error");
  const openCount = board.lists.reduce((n, l) => n + l.tasks.filter((t) => !t.done).length, 0);
  const tabs = bp === "mobile";
  const currentList = board.lists.find((l) => l.id === activeTab) ?? board.lists[0];

  const archiveTask = (task: Task) =>
    updateTask.mutate(
      { id: task.id, archived: true },
      {
        onSuccess: () =>
          notify("Tarefa arquivada.", "info", {
            // Desfazer devolve a tarefa à posição em que estava.
            action: { label: "Desfazer", onClick: () => setArchived.mutate({ ids: [task.id], archived: false }) },
          }),
        onError: fail,
      },
    );

  const archiveCompletedOf = (list: TaskListWithTasks) =>
    archiveCompleted.mutate(list.id, {
      onSuccess: ({ ids }) => {
        if (ids.length === 0) return;
        notify(ids.length === 1 ? "1 tarefa arquivada." : `${ids.length} tarefas arquivadas.`, "info", {
          action: { label: "Desfazer", onClick: () => setArchived.mutate({ ids, archived: false }) },
        });
      },
      onError: fail,
    });

  const taskActions = (task: Task): TaskCardActions => ({
    onToggle: () => updateTask.mutate({ id: task.id, done: !task.done }, { onError: fail }),
    onRename: (title) => updateTask.mutate({ id: task.id, title }, { onError: fail }),
    onPriority: (priority) => updateTask.mutate({ id: task.id, priority }, { onError: fail }),
    onArchive: () => archiveTask(task),
    onMove: () => setDialog({ type: "move-task", task }),
    onDelete: () => setDialog({ type: "delete-task", task }),
  });

  const columnActions = (list: TaskListWithTasks): ColumnActions => ({
    onAddTask: (title) => addTask(list.id, title),
    onRenameList: () => setDialog({ type: "rename-list", list }),
    onArchiveList: () =>
      updateList.mutate(
        { id: list.id, input: { archived: true } },
        {
          onSuccess: () =>
            notify(`Lista "${list.name}" arquivada.`, "info", {
              action: { label: "Desfazer", onClick: () => updateList.mutate({ id: list.id, input: { archived: false } }) },
            }),
          onError: fail,
        },
      ),
    onDeleteList: () => setDialog({ type: "delete-list", list }),
    onArchiveCompleted: () => archiveCompletedOf(list),
    onToggleSort: () => setSortedByPriority((s) => !s),
    taskActions,
  });

  const addTask = (listId: number, title: string) => createTask.mutate({ listId, title }, { onError: fail });

  return (
    <div className="flex h-full flex-col bg-[var(--panel)]">
      <header className="flex shrink-0 items-center gap-2 px-2 pb-3 pt-4 md:gap-3 md:px-7">
        {onBack && (
          <IconButton label="Voltar para as pastas" onClick={onBack}>
            <ChevronLeftIcon />
          </IconButton>
        )}
        <div className="min-w-0 flex-1 px-1">
          <h1 className="truncate text-[22px] font-bold tracking-tight">{board.folder.name}</h1>
          <p className="text-[13px] text-[var(--muted)]">
            {board.lists.length} {board.lists.length === 1 ? "lista" : "listas"} · {openCount}{" "}
            {openCount === 1 ? "tarefa aberta" : "tarefas abertas"}
          </p>
        </div>
        <label className="hidden items-center gap-2 text-[13px] text-[var(--muted)] md:flex">
          <input
            type="checkbox"
            role="switch"
            checked={sortedByPriority}
            onChange={() => setSortedByPriority((s) => !s)}
            className="h-[18px] w-8 accent-[var(--accent)]"
          />
          Ordenar por prioridade
        </label>
        <button
          type="button"
          onClick={() => setDialog({ type: "new-list" })}
          className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-[var(--accent)] px-3.5 text-sm font-semibold text-[#1c1c1e] hover:brightness-105"
        >
          <PlusIcon />
          <span className="hidden sm:inline">Nova lista</span>
          <span className="sm:hidden">Lista</span>
        </button>
        <Menu
          label="Ações da pasta"
          items={[
            { label: "Renomear pasta", onClick: () => setDialog({ type: "rename-folder" }) },
            {
              label: "Arquivar pasta",
              icon: <ArchiveIcon />,
              onClick: () =>
                updateFolder.mutate(
                  { id: folderId, input: { archived: true } },
                  {
                    onSuccess: () => {
                      navigate(TASKS_ROOT);
                      notify("Pasta arquivada.", "info", {
                        action: {
                          label: "Desfazer",
                          onClick: () => updateFolder.mutate({ id: folderId, input: { archived: false } }),
                        },
                      });
                    },
                    onError: fail,
                  },
                ),
            },
            { label: "Excluir pasta", icon: <TrashIcon />, danger: true, onClick: () => setDialog({ type: "delete-folder" }) },
          ]}
        />
      </header>

      {board.lists.length === 0 ? (
        <EmptyBoard onCreate={() => setDialog({ type: "new-list" })} />
      ) : tabs ? (
        <>
          <div role="tablist" aria-label="Listas" className="flex shrink-0 gap-1 overflow-x-auto border-b border-[var(--border)] px-3">
            {board.lists.map((list) => {
              const selected = list.id === currentList.id;
              return (
                <button
                  key={list.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveTab(list.id)}
                  className={cn(
                    "h-11 shrink-0 border-b-[3px] px-3 text-sm",
                    selected ? "border-[var(--accent)] font-semibold" : "border-transparent text-[var(--muted)]",
                  )}
                >
                  {list.name} <span className="font-normal text-[var(--muted)]">{list.tasks.filter((t) => !t.done).length}</span>
                </button>
              );
            })}
          </div>
          <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto bg-[var(--sidebar)] p-3">
            <TaskDnd board={board} enabled={!sortedByPriority}>
              {(wrapper) => (
                <TaskColumn
                  list={currentList}
                  sortedByPriority={sortedByPriority}
                  fluid
                  {...columnActions(currentList)}
                  renderOpenTask={wrapper.renderOpenTask}
                  wrapOpenList={wrapper.wrapOpenList(currentList)}
                />
              )}
            </TaskDnd>
          </div>
        </>
      ) : (
        <TaskDnd board={board} enabled={!sortedByPriority}>
          {(wrapper) => (
            <div className="flex min-h-0 flex-1 items-start gap-4 overflow-auto px-7 pb-6 pt-1">
              {board.lists.map((list) => (
                <TaskColumn
                  key={list.id}
                  list={list}
                  sortedByPriority={sortedByPriority}
                  {...columnActions(list)}
                  renderOpenTask={wrapper.renderOpenTask}
                  wrapOpenList={wrapper.wrapOpenList(list)}
                />
              ))}
              <button
                type="button"
                onClick={() => setDialog({ type: "new-list" })}
                className="flex h-14 w-[300px] shrink-0 items-center gap-2 rounded-[14px] border-2 border-dashed border-[var(--muted)] px-4 text-sm text-[var(--muted)] hover:text-[var(--text)]"
              >
                <PlusIcon />
                Nova lista
              </button>
            </div>
          )}
        </TaskDnd>
      )}

      {dialog?.type === "new-list" && (
        <PromptDialog
          title="Nova lista"
          placeholder="Ex.: A fazer"
          confirmLabel="Criar"
          onClose={() => setDialog(null)}
          onConfirm={(name) => {
            createList.mutate({ folderId, name }, { onSuccess: (list) => setActiveTab(list.id), onError: fail });
            setDialog(null);
          }}
        />
      )}
      {dialog?.type === "rename-list" && (
        <PromptDialog
          title="Renomear lista"
          initial={dialog.list.name}
          confirmLabel="Salvar"
          onClose={() => setDialog(null)}
          onConfirm={(name) => {
            updateList.mutate({ id: dialog.list.id, input: { name } }, { onError: fail });
            setDialog(null);
          }}
        />
      )}
      {dialog?.type === "rename-folder" && (
        <PromptDialog
          title="Renomear pasta"
          initial={board.folder.name}
          confirmLabel="Salvar"
          onClose={() => setDialog(null)}
          onConfirm={(name) => {
            updateFolder.mutate({ id: folderId, input: { name } }, { onError: fail });
            setDialog(null);
          }}
        />
      )}
      {dialog?.type === "delete-folder" && (
        <ConfirmDialog
          title="Excluir pasta de tarefas"
          message={`Excluir "${board.folder.name}"? As listas e tarefas dela serão apagadas para sempre. Se quiser guardar, arquive a pasta.`}
          confirmLabel="Excluir"
          onClose={() => setDialog(null)}
          onConfirm={() => {
            deleteFolder.mutate(folderId, {
              onSuccess: () => {
                navigate(TASKS_ROOT);
                notify("Pasta excluída.");
              },
              onError: fail,
            });
            setDialog(null);
          }}
        />
      )}
      {dialog?.type === "delete-task" && (
        <ConfirmDialog
          title="Excluir tarefa"
          message={`Excluir "${dialog.task.title}"? Isso não pode ser desfeito. Para guardar, use "Arquivar tarefa".`}
          confirmLabel="Excluir"
          onClose={() => setDialog(null)}
          onConfirm={() => {
            deleteTask.mutate(dialog.task.id, { onError: fail });
            setDialog(null);
          }}
        />
      )}
      {dialog?.type === "delete-list" && (
        <Modal
          title={`Excluir a lista “${dialog.list.name}”?`}
          onClose={() => setDialog(null)}
          footer={
            <>
              <Button onClick={() => setDialog(null)}>Cancelar</Button>
              <Button
                variant="subtle"
                onClick={() => {
                  const list = dialog.list;
                  setDialog(null);
                  columnActions(list).onArchiveList();
                }}
              >
                Arquivar em vez disso
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  deleteList.mutate(dialog.list.id, { onError: fail });
                  setDialog(null);
                }}
              >
                Excluir
              </Button>
            </>
          }
        >
          <p className="text-sm text-[var(--muted)]">
            {dialog.list.tasks.length === 0
              ? "A lista está vazia."
              : `As ${dialog.list.tasks.length} tarefas da lista serão apagadas.`}{" "}
            Se quiser guardar, arquive a lista em vez de excluir.
          </p>
        </Modal>
      )}
      {dialog?.type === "move-task" && (
        <MoveTaskDialog
          task={dialog.task}
          lists={board.lists}
          onClose={() => setDialog(null)}
          onMove={(listId) => {
            updateTask.mutate({ id: dialog.task.id, listId }, { onError: fail });
            setDialog(null);
          }}
        />
      )}
    </div>
  );
}

function EmptyBoard({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
      <span className="text-4xl text-[var(--muted)]">
        <BoardIcon />
      </span>
      <h2 className="text-base font-semibold">Nenhuma lista ainda</h2>
      <p className="max-w-60 text-sm leading-relaxed text-[var(--muted)]">Crie uma lista para organizar as tarefas desta pasta.</p>
      <Button variant="primary" className="mt-2" onClick={onCreate}>
        Criar lista
      </Button>
    </div>
  );
}

/** "Mover para…": alternativa ao arrastar, também para teclado e celular. */
function MoveTaskDialog({
  task,
  lists,
  onMove,
  onClose,
}: {
  task: Task;
  lists: TaskListWithTasks[];
  onMove: (listId: number) => void;
  onClose: () => void;
}) {
  return (
    <Modal title="Mover tarefa para" onClose={onClose}>
      <ul className="max-h-80 overflow-y-auto">
        {lists.map((list) => (
          <li key={list.id}>
            <button
              type="button"
              disabled={list.id === task.listId}
              onClick={() => onMove(list.id)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--surface-hover)] disabled:opacity-40"
            >
              {list.name}
              {list.id === task.listId && <span className="ml-auto text-xs text-[var(--muted)]">atual</span>}
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
