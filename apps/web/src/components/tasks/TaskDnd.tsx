import type { ReactNode } from "react";
import type { Task, TaskBoard, TaskListWithTasks } from "@z-notes/shared";

export interface DndWrapper {
  renderOpenTask: (task: Task, card: ReactNode) => ReactNode;
  wrapOpenList: (list: TaskListWithTasks) => (tasks: Task[], children: ReactNode) => ReactNode;
}

interface Props {
  board: TaskBoard;
  enabled: boolean;
  children: (wrapper: DndWrapper) => ReactNode;
}

/** Arrastar e soltar (reordenar e mover entre listas). Ligado na etapa seguinte. */
export function TaskDnd({ children }: Props) {
  return <>{children({ renderOpenTask: (_task, card) => card, wrapOpenList: () => (_tasks, c) => c })}</>;
}
