import { useEffect, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { TASK_PRIORITIES, type Task, type TaskPriority } from "@z-notes/shared";
import { cn } from "@/lib/cn";
import { PRIORITY_LABEL } from "@/lib/taskPriority";
import { useOnline } from "@/hooks/useOnline";
import { useAutosave } from "@/hooks/useAutosave";
import { useEditMode } from "@/hooks/useEditMode";
import { useUpdateTask } from "@/hooks/useTasks";
import { toggleTaskListItem, isTaskListLine } from "@/lib/taskList";
import { IconButton } from "../ui/IconButton";
import { Menu } from "../ui/Menu";
import {
  ArchiveIcon,
  CheckIcon,
  ChevronLeftIcon,
  CloseIcon,
  DotsIcon,
  FolderIcon,
  TrashIcon,
} from "../icons";
import { PriorityBars, PriorityChip } from "./PriorityChip";

interface Props {
  task: Task;
  listName?: string;
  onClose: () => void;
  onConvertToNote: () => void;
  onArchive: () => void;
  onDelete: () => void;
  isMobile?: boolean;
}

export function TaskDetailsPanel({
  task,
  listName,
  onClose,
  onConvertToNote,
  onArchive,
  onDelete,
  isMobile = false,
}: Props) {
  const online = useOnline();
  const updateTask = useUpdateTask();

  const [title, setTitle] = useState(task.title);

  useEffect(() => {
    setTitle(task.title);
  }, [task.id, task.title]);

  const handleTitleBlur = () => {
    const trimmed = title.trim();
    if (trimmed && trimmed !== task.title) {
      updateTask.mutate({ id: task.id, title: trimmed });
    } else {
      setTitle(task.title);
    }
  };

  const commitContent = (contentMd: string) => {
    updateTask.mutate({ id: task.id, contentMd });
  };

  const autosave = useAutosave({
    resetKey: task.id,
    initialContent: task.contentMd ?? "",
    commit: commitContent,
  });

  const editMode = useEditMode(task.id);

  const status = !online && updateTask.isPending ? "offline" : updateTask.isPending ? "saving" : "saved";

  const menuItems = [
    { label: "Converter em nota", icon: <FolderIcon />, onClick: onConvertToNote },
    { label: "Arquivar tarefa", icon: <ArchiveIcon />, onClick: onArchive },
    { label: "Excluir tarefa", icon: <TrashIcon />, danger: true, onClick: onDelete },
  ];

  return (
    <aside
      aria-label="Detalhes da tarefa"
      className={cn(
        "flex flex-col bg-[var(--panel)]",
        isMobile
          ? "fixed inset-0 z-50 overflow-hidden"
          : "h-full w-[420px] lg:w-[480px] shrink-0 border-l border-[var(--border)] shadow-sm",
      )}
    >
      {/* Cabeçalho do painel */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--border)] px-4">
        <div className="flex items-center gap-2">
          <IconButton label="Fechar detalhes" onClick={onClose}>
            {isMobile ? <ChevronLeftIcon /> : <CloseIcon />}
          </IconButton>
          {listName && (
            <span className="rounded-full bg-[var(--surface-hover)] px-2.5 py-0.5 text-xs font-medium text-[var(--muted)]">
              {listName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <SaveIndicator status={status} />
          <ModeToggle
            editing={editMode.editing}
            onEdit={editMode.enterEdit}
            onView={editMode.exitEdit}
          />
          <Menu
            label="Ações da tarefa"
            items={menuItems}
            trigger={
              <IconButton label="Ações da tarefa" compact>
                <DotsIcon />
              </IconButton>
            }
          />
        </div>
      </header>

      {/* Título e prioridade */}
      <div className="border-b border-[var(--border)] px-5 py-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            role="checkbox"
            aria-checked={task.done}
            aria-label={`${task.done ? "Reabrir" : "Concluir"} tarefa`}
            onClick={() => updateTask.mutate({ id: task.id, done: !task.done })}
            className={cn(
              "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition cursor-pointer",
              task.done
                ? "bg-[var(--accent)] text-[#1c1c1e]"
                : "border-[1.8px] border-[#78909c] hover:border-[var(--text)]",
            )}
          >
            {task.done && <CheckIcon className="text-[12px]" strokeWidth={3.4} />}
          </button>

          <div className="min-w-0 flex-1">
            <input
              type="text"
              value={title}
              aria-label="Título da tarefa nos detalhes"
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                }
              }}
              className={cn(
                "w-full bg-transparent text-lg font-semibold leading-snug outline-none",
                task.done && "text-[var(--muted)] line-through",
              )}
              placeholder="Título da tarefa…"
              maxLength={500}
            />

            <div className="mt-2.5 flex items-center gap-3">
              <PriorityMenu
                task={task}
                onPriority={(p) => updateTask.mutate({ id: task.id, priority: p })}
              >
                <button
                  type="button"
                  aria-label={`Prioridade ${PRIORITY_LABEL[task.priority]}: alterar`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs hover:bg-[var(--surface-hover)] cursor-pointer"
                >
                  <PriorityBars priority={task.priority} size={14} />
                  <span>{PRIORITY_LABEL[task.priority]}</span>
                </button>
              </PriorityMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Editor Markdown de detalhes */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-4">
        <div className="mb-2 flex items-center justify-between text-xs text-[var(--muted)]">
          <span>Detalhes e notas</span>
          <span>{editMode.editing ? "Editando markdown" : "Duplo clique para editar"}</span>
        </div>

        {editMode.editing ? (
          <textarea
            autoFocus
            aria-label="Conteúdo em markdown da tarefa"
            value={autosave.content}
            onChange={(e) => autosave.setContent(e.target.value)}
            onBlur={editMode.exitEdit}
            onKeyDown={(e) => {
              if (e.key === "Escape") editMode.exitEdit();
            }}
            placeholder="Escreva notas, checklists e detalhes da tarefa em markdown…"
            className="min-h-[220px] flex-1 resize-none bg-transparent font-mono text-sm leading-relaxed outline-none placeholder:text-[var(--muted)] placeholder:font-sans"
          />
        ) : (
          <div
            data-testid="task-content-preview"
            onDoubleClick={editMode.enterEdit}
            className="md min-h-[220px] flex-1 cursor-text overflow-auto text-sm leading-relaxed"
          >
            {autosave.content.trim() ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  input: ({ type, checked, ...props }) => {
                    if (type !== "checkbox") return <input type={type} {...props} />;
                    return (
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const lines = autosave.content.split("\n");
                          const idx = lines.findIndex((l) => isTaskListLine(l));
                          if (idx === -1) return;
                          const updated = toggleTaskListItem(autosave.content, idx);
                          autosave.setContent(updated);
                        }}
                      />
                    );
                  },
                }}
              >
                {autosave.content}
              </ReactMarkdown>
            ) : (
              <p className="text-sm italic text-[var(--muted)]">
                Nenhum detalhe adicionado ainda. Dê um duplo clique ou clique em Editar para escrever markdown.
              </p>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

function SaveIndicator({ status }: { status: "saving" | "saved" | "offline" }) {
  const text = status === "saving" ? "Salvando…" : status === "offline" ? "Offline" : "Salvo";
  return <span className="px-2 text-xs text-[var(--muted)]">{text}</span>;
}

function ModeToggle({
  editing,
  onEdit,
  onView,
}: {
  editing: boolean;
  onEdit: () => void;
  onView: () => void;
}) {
  const base = "rounded-md px-2.5 py-1 text-xs transition cursor-pointer";
  const on = "bg-[var(--surface-hover)] font-semibold text-[var(--text)] shadow-xs";
  const off = "text-[var(--muted)] hover:text-[var(--text)]";
  return (
    <div
      role="group"
      aria-label="Modo de edição dos detalhes"
      className="mr-1 flex rounded-lg bg-[var(--surface)] p-0.5 border border-[var(--border)]"
    >
      <button
        type="button"
        aria-pressed={!editing}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onView}
        className={cn(base, !editing ? on : off)}
      >
        Visualizar
      </button>
      <button
        type="button"
        aria-pressed={editing}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onEdit}
        className={cn(base, editing ? on : off)}
      >
        Editar
      </button>
    </div>
  );
}

function PriorityMenu({
  task,
  onPriority,
  children,
}: {
  task: Task;
  onPriority: (priority: TaskPriority) => void;
  children: ReactNode;
}) {
  return (
    <Menu
      label={`Prioridade de ${task.title}`}
      align="left"
      items={TASK_PRIORITIES.map((p) => ({
        label: PRIORITY_LABEL[p],
        icon: <PriorityBars priority={p} size={14} />,
        checked: p === task.priority,
        onClick: () => onPriority(p),
      }))}
      trigger={children}
    />
  );
}
