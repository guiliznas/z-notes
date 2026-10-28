import { useState, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task, TaskBoard, TaskListWithTasks } from "@z-notes/shared";
import { useUpdateTask } from "@/hooks/useTasks";
import { cn } from "@/lib/cn";
import { computeMove, type DropTarget } from "@/lib/taskBoard";
import { useToast } from "../ui/Toast";
import type { DndCardProps } from "./TaskCard";

export const taskDndId = (id: number) => `task-${id}`;
export const listDndId = (id: number) => `list-${id}`;

/** Interpreta o id usado no dnd-kit ("task-12" / "list-3"). */
export function parseDndId(raw: unknown): DropTarget | null {
  const match = /^(task|list)-(\d+)$/.exec(String(raw));
  if (!match) return null;
  return { type: match[1] as "task" | "list", id: Number(match[2]) };
}

export interface DndWrapper {
  renderOpenTask: (task: Task, render: (dnd?: DndCardProps) => ReactNode) => ReactNode;
  wrapOpenList: (list: TaskListWithTasks) => (tasks: Task[], children: ReactNode) => ReactNode;
}

interface Props {
  board: TaskBoard;
  /** desligado quando a ordem vem da prioridade (arrastar não faria sentido). */
  enabled: boolean;
  children: (wrapper: DndWrapper) => ReactNode;
}

const passthrough: DndWrapper = {
  renderOpenTask: (_task, render) => render(),
  wrapOpenList: () => (_tasks, children) => children,
};

/** Arrastar e soltar: reordenar dentro da lista e mover entre listas (mouse, toque e teclado). */
export function TaskDnd({ board, enabled, children }: Props) {
  const updateTask = useUpdateTask();
  const { notify } = useToast();
  const [active, setActive] = useState<Task | null>(null);
  const sensors = useSensors(
    // Distância mínima: clique simples (editar título, concluir) não vira arrasto sem querer.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (!enabled) return <>{children(passthrough)}</>;

  const onDragStart = (event: DragStartEvent) => {
    const target = parseDndId(event.active.id);
    const task = target?.type === "task" ? board.lists.flatMap((l) => l.tasks).find((t) => t.id === target.id) : undefined;
    setActive(task ?? null);
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActive(null);
    const from = parseDndId(event.active.id);
    const over = event.over ? parseDndId(event.over.id) : null;
    if (!from || from.type !== "task" || !over) return;
    const move = computeMove(board, from.id, over);
    if (!move) return;
    updateTask.mutate(
      { id: from.id, listId: move.listId, afterId: move.afterId },
      { onError: () => notify("Não foi possível mover a tarefa.", "error") },
    );
  };

  const wrapper: DndWrapper = {
    renderOpenTask: (task, render) => <SortableTask key={task.id} task={task} render={render} />,
    wrapOpenList: (list) => (tasks, content) => (
      <ColumnDropZone list={list} tasks={tasks}>
        {content}
      </ColumnDropZone>
    ),
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActive(null)}
    >
      {children(wrapper)}
      <DragOverlay>
        {active ? (
          <div className="rotate-2 rounded-[10px] border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm shadow-xl">
            {active.title}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function SortableTask({ task, render }: { task: Task; render: (dnd?: DndCardProps) => ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: taskDndId(task.id),
  });
  return render({
    innerRef: setNodeRef,
    style: { transform: CSS.Transform.toString(transform), transition },
    dragging: isDragging,
    handle: (
      <button
        type="button"
        ref={setActivatorNodeRef}
        aria-label={`Arrastar tarefa: ${task.title}`}
        className="absolute left-0.5 top-3 flex h-[18px] w-2.5 cursor-grab touch-none items-center justify-center text-[#90a4ae] active:cursor-grabbing md:opacity-0 md:focus-visible:opacity-100 md:group-hover:opacity-100"
        {...attributes}
        {...listeners}
      >
        <svg width="10" height="14" viewBox="0 0 12 16" fill="currentColor" aria-hidden="true">
          <circle cx="3" cy="3" r="1.4" />
          <circle cx="9" cy="3" r="1.4" />
          <circle cx="3" cy="8" r="1.4" />
          <circle cx="9" cy="8" r="1.4" />
          <circle cx="3" cy="13" r="1.4" />
          <circle cx="9" cy="13" r="1.4" />
        </svg>
      </button>
    ),
  });
}

/** Contexto de ordenação da coluna + área onde soltar (inclusive em lista vazia). */
function ColumnDropZone({ list, tasks, children }: { list: TaskListWithTasks; tasks: Task[]; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: listDndId(list.id) });
  return (
    <SortableContext items={tasks.map((t) => taskDndId(t.id))} strategy={verticalListSortingStrategy}>
      <div
        ref={setNodeRef}
        className={cn("rounded-lg transition-colors", tasks.length === 0 && "min-h-8", isOver && "bg-[var(--accent-soft)]")}
      >
        {children}
      </div>
    </SortableContext>
  );
}
