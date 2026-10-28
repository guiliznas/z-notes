import { useRef, useState, type CSSProperties, type ReactNode, type Ref } from "react";
import { TASK_PRIORITIES, type Task, type TaskPriority } from "@z-notes/shared";
import { cn } from "@/lib/cn";
import { PRIORITY_LABEL } from "@/lib/taskPriority";
import { Menu } from "../ui/Menu";
import { ArchiveIcon, CheckIcon, MoveIcon, TrashIcon } from "../icons";
import { PriorityBars, PriorityChip } from "./PriorityChip";

export interface TaskCardActions {
  onToggle: () => void;
  onRename: (title: string) => void;
  onPriority: (priority: TaskPriority) => void;
  onArchive: () => void;
  onMove: () => void;
  onDelete: () => void;
}

interface Props extends TaskCardActions {
  task: Task;
  /** ganchos do arrastar (preenchidos por SortableTask). */
  innerRef?: Ref<HTMLDivElement>;
  style?: CSSProperties;
  dragging?: boolean;
  handle?: ReactNode;
}

export function TaskCard({
  task,
  onToggle,
  onRename,
  onPriority,
  onArchive,
  onMove,
  onDelete,
  innerRef,
  style,
  dragging,
  handle,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const settled = useRef(false);

  const startEdit = () => {
    settled.current = false;
    setDraft(task.title);
    setEditing(true);
  };
  const finish = (save: boolean) => {
    if (settled.current) return;
    settled.current = true;
    setEditing(false);
    const title = draft.trim();
    if (save && title && title !== task.title) onRename(title);
  };

  const menuItems = [
    { label: "Mover para…", icon: <MoveIcon />, onClick: onMove },
    { label: "Arquivar tarefa", icon: <ArchiveIcon />, onClick: onArchive },
    { label: "Excluir tarefa", icon: <TrashIcon />, danger: true, onClick: onDelete },
  ];

  return (
    <div
      ref={innerRef}
      style={style}
      className={cn(
        "group relative flex gap-2.5 rounded-[10px] border border-[var(--border)] bg-[var(--card)] px-3 py-2.5",
        editing && "border-[var(--accent)] ring-1 ring-[var(--accent)]",
        dragging && "z-10 opacity-60 shadow-xl",
      )}
    >
      {handle}
      <button
        type="button"
        role="checkbox"
        aria-checked={task.done}
        aria-label={`${task.done ? "Reabrir" : "Concluir"} tarefa: ${task.title}`}
        onClick={onToggle}
        className={cn(
          "mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full",
          task.done
            ? "bg-[var(--accent)] text-[#1c1c1e]"
            : "border-[1.8px] border-[#78909c] hover:border-[var(--text)]",
        )}
      >
        {task.done && <CheckIcon className="text-[11px]" strokeWidth={3.4} />}
      </button>

      <div className="min-w-0 flex-1">
        {editing ? (
          <>
            <input
              autoFocus
              aria-label="Título da tarefa"
              value={draft}
              maxLength={500}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") finish(true);
                if (e.key === "Escape") finish(false);
              }}
              onBlur={() => finish(true)}
              className="w-full bg-transparent text-sm leading-snug outline-none"
            />
            <div className="mt-1 text-xs text-[var(--muted)]">Enter salva · Esc cancela</div>
          </>
        ) : (
          <button
            type="button"
            onClick={startEdit}
            className={cn(
              "block w-full break-words text-left text-sm leading-snug",
              task.done && "text-[var(--muted)] line-through",
            )}
          >
            {task.title}
          </button>
        )}

        {!task.done && !editing && (
          <div className="mt-1.5">
            <Menu
              label={`Prioridade de ${task.title}`}
              align="left"
              items={TASK_PRIORITIES.map((p) => ({
                label: PRIORITY_LABEL[p],
                icon: <PriorityBars priority={p} size={14} />,
                checked: p === task.priority,
                onClick: () => onPriority(p),
              }))}
              trigger={
                task.priority === "none" ? (
                  <button
                    type="button"
                    aria-label="Definir prioridade"
                    className="inline-flex h-5 items-center gap-1 rounded-full px-1.5 text-[11px] text-[var(--muted)] hover:bg-[var(--surface-hover)] md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100"
                  >
                    <PriorityBars priority="none" />
                    Prioridade
                  </button>
                ) : (
                  <button type="button" aria-label={`Prioridade ${PRIORITY_LABEL[task.priority]}: alterar`}>
                    <PriorityChip priority={task.priority} />
                  </button>
                )
              }
            />
          </div>
        )}
      </div>

      <div className="-mr-1 shrink-0 self-start md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
        <Menu label={`Ações da tarefa: ${task.title}`} items={menuItems} />
      </div>
    </div>
  );
}
