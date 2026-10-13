import type { ObjectId } from 'mongodb';
import { toTaskView, type TaskView } from '../mappers/task.mapper.js';
import { parseObjectId } from '../repositories/base.repository.js';
import type { TasksRepository } from '../repositories/tasks.repository.js';
import type {
  CreateTaskRequest,
  MoveTaskRequest,
  PatchTaskRequest,
  TasksQuery,
} from '../schemas/tasks.schemas.js';

export class TasksService {
  constructor(private readonly tasks: TasksRepository) {}

  async list(userId: ObjectId, query: TasksQuery): Promise<TaskView[]> {
    const tasks = await this.tasks.listByUser(userId, query);
    return tasks.map(toTaskView);
  }

  async create(userId: ObjectId, input: CreateTaskRequest): Promise<TaskView> {
    const task = await this.tasks.create(userId, input);
    return toTaskView(task);
  }

  async update(
    userId: ObjectId,
    id: string,
    input: PatchTaskRequest,
    expectedVersion: number,
  ): Promise<TaskView> {
    const task = await this.tasks.update(userId, parseObjectId(id), input, expectedVersion);
    return toTaskView(task);
  }

  remove(userId: ObjectId, id: string, expectedVersion: number): Promise<void> {
    return this.tasks.softDelete(userId, parseObjectId(id), expectedVersion);
  }

  async restore(userId: ObjectId, id: string): Promise<TaskView> {
    const task = await this.tasks.restore(userId, parseObjectId(id));
    return toTaskView(task);
  }

  async move(
    userId: ObjectId,
    id: string,
    input: MoveTaskRequest,
    expectedVersion: number,
  ): Promise<TaskView> {
    const placement = {
      beforeId: input.beforeId ? parseObjectId(input.beforeId, 'beforeId') : null,
      afterId: input.afterId ? parseObjectId(input.afterId, 'afterId') : null,
    };
    const task = await this.tasks.move(userId, parseObjectId(id), placement, expectedVersion);
    return toTaskView(task);
  }
}
