import { objectIdToString } from '../repositories/base.repository.js';
import type { TaskDocument, TaskPriority, TaskStatus } from '../repositories/tasks.repository.js';

export interface TaskView {
  id: string;
  title: string;
  dueDate: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  estimateMinutes: number;
  order: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export function toTaskView(task: TaskDocument): TaskView {
  return {
    id: objectIdToString(task._id),
    title: task.title,
    dueDate: task.dueDate,
    priority: task.priority,
    status: task.status,
    estimateMinutes: task.estimateMinutes,
    order: task.order,
    version: task.version,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}
