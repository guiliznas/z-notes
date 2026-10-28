import { useState, type ReactNode } from "react";
import { sortByPriority, type Task, type TaskListWithTasks } from "@z-notes/shared";
import { cn } from "@/lib/cn";
import { doneTasks, openTasks } from "@/lib/taskBoard";
import { Menu } from "../ui/Menu";
import { ArchiveIcon, ChevronDownIcon, ChevronRightIcon, PlusIcon, TrashIcon } from "../icons";
import { TaskCard, type DndCardProps, type TaskCardActions } from "./TaskCard";

export interface ColumnActions {
  onAddTask: (title: string) => void;
  onRenameList: () => void;
  onArchiveList: () => void;
  onDeleteList: () => void;
  onArchiveCompleted: () => void;
  onToggleSort: () => void;
  /** ações de cada tarefa, ligadas ao id dela. */
  taskActions: (task: Task) => TaskCardActions;
}

interface Props extends ColumnActions {
  list: TaskListWithTasks;
  sortedByPriority: boolean;
  /** como renderizar cada tarefa aberta (o arrastar injeta alça e ganchos no cartão). */
  renderOpenTask?: (task: Task, render: (dnd?: DndCardProps) => ReactNode) => ReactNode;
  /** envolve a lista de tarefas abertas (contexto de ordenação do arrastar). */
  wrapOpenList?: (tasks: Task[], children: ReactNode) => ReactNode;
  /** ocupa a largura toda (modo abas no celular). */
  fluid?: boolean;
}

export function TaskColumn({
  list,
  sortedByPriority,
  onAddTask,
  onRenameList,
  onArchiveList,
  onDeleteList,
  onArchiveCompleted,
  onToggleSort,
  taskActions,
  renderOpenTask,
  wrapOpenList,
  fluid,
}: Props) {
  const [doneOpen, setDoneOpen] = useState(true);
  const open = openTasks(list.tasks);
  const shown = sortedByPriority ? sortByPriority(open) : open;
  const done = doneTasks(list.tasks);

  const card = (task: Task, dnd?: DndCardProps) => <TaskCard key={task.id} task={task} {...taskActions(task)} {...dnd} />;
  const cards = shown.map((task) =>
    renderOpenTask && !sortedByPriority ? renderOpenTask(task, (dnd) => card(task, dnd)) : card(task),
  );

  return (
    <section
      aria-label={`Lista ${list.name}`}
      className={cn(
        "flex flex-col gap-2 rounded-[14px] bg-[var(--sidebar)] p-3",
        fluid ? "w-full" : "w-[300px] shrink-0",
      )}
    >
      <div className="flex items-center gap-2 px-1 pb-1 pt-0.5">
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">{list.name}</h2>
        <span className="text-xs text-[var(--muted)]">{open.length}</span>
        <Menu
          label={`Ações da lista ${list.name}`}
          items={[
            { label: "Renomear lista", onClick: onRenameList },
            { label: "Ordenar por prioridade", checked: sortedByPriority, onClick: onToggleSort },
            ...(done.length > 0
              ? [{ label: `Arquivar concluídas (${done.length})`, icon: <ArchiveIcon />, onClick: onArchiveCompleted }]
              : []),
            { label: "Arquivar lista", icon: <ArchiveIcon />, onClick: onArchiveList },
            { label: "Excluir lista", icon: <TrashIcon />, danger: true, onClick: onDeleteList },
          ]}
        />
      </div>

      <AddTask onAdd={onAddTask} />

      {wrapOpenList ? wrapOpenList(shown, <div className="flex flex-col gap-2">{cards}</div>) : cards}

      {open.length === 0 && done.length === 0 && (
        <div className="rounded-[10px] border border-dashed border-[var(--muted)] px-3 py-4 text-center text-[13px] text-[var(--muted)]">
          Nenhuma tarefa. Digite acima e aperte Enter.
        </div>
      )}

      {done.length > 0 && (
        <>
          <div className="flex items-center gap-1.5 px-1 pt-2 text-[13px] text-[var(--muted)]">
            <button
              type="button"
              aria-expanded={doneOpen}
              onClick={() => setDoneOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded px-0.5 hover:text-[var(--text)]"
            >
              {doneOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
              Concluídas ({done.length})
            </button>
            <span className="flex-1" />
            <button
              type="button"
              onClick={onArchiveCompleted}
              className="rounded px-1 py-0.5 text-xs font-semibold text-[var(--text)] underline decoration-[var(--accent)] decoration-2 underline-offset-4"
            >
              Arquivar concluídas
            </button>
          </div>
          {doneOpen && (
            <div className="flex flex-col gap-2">
              {done.map((task) => (
                <TaskCard key={task.id} task={task} {...taskActions(task)} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function AddTask({ onAdd }: { onAdd: (title: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  if (!adding) {
    return (
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
      >
        <PlusIcon />
        Adicionar tarefa
      </button>
    );
  }

  const submit = () => {
    const title = draft.trim();
    if (!title) return;
    onAdd(title);
    setDraft("");
  };

  return (
    <input
      autoFocus
      aria-label="Título da nova tarefa"
      value={draft}
      maxLength={500}
      placeholder="Título da tarefa"
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") submit();
        if (e.key === "Escape") {
          setDraft("");
          setAdding(false);
        }
      }}
      onBlur={() => {
        if (!draft.trim()) setAdding(false);
      }}
      className="h-9 w-full rounded-lg border border-[var(--accent)] bg-[var(--card)] px-3 text-sm outline-none placeholder:text-[var(--muted)]"
    />
  );
}
