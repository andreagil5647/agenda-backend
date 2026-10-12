import { ObjectId, type Collection, type Db, type Filter, type MatchKeysAndValues } from 'mongodb';
import { NotFoundError } from '../errors/app-error.js';
import {
  byUserAndIdFilter,
  byUserFilter,
  createRepositoryMetadata,
  objectIdToString,
  restoreUpdate,
  softDeleteUpdate,
  versionedUpdate,
  type UserOwnedRepositoryDocument,
} from './base.repository.js';

export type TaskPriority = 'none' | 'low' | 'medium' | 'high';
export type TaskStatus = 'todo' | 'done';

export interface TaskDocument extends UserOwnedRepositoryDocument {
  title: string;
  dueDate: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  estimateMinutes: number;
  order: string;
}

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

export interface CreateTaskInput {
  title: string;
  dueDate?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  estimateMinutes: number;
}

export type UpdateTaskInput = Partial<CreateTaskInput> & { order?: string };

export interface TaskFilters {
  status?: TaskStatus;
  due?: string;
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

function midpoint(before: string | null, after: string | null): string {
  const beforeValue = before ? Number(before) : 0;
  const afterValue = after ? Number(after) : beforeValue + 2;
  return ((beforeValue + afterValue) / 2).toFixed(6);
}

export class TasksRepository {
  private readonly tasks: Collection<TaskDocument>;

  constructor(db: Db) {
    this.tasks = db.collection<TaskDocument>('tasks');
  }

  async listByUser(userId: ObjectId, filters: TaskFilters = {}): Promise<TaskDocument[]> {
    const filter: Filter<TaskDocument> = {};
    if (filters.status) filter.status = filters.status;
    if (filters.due) filter.dueDate = filters.due;

    return this.tasks
      .find(byUserFilter<TaskDocument>(userId, filter))
      .sort({ status: 1, order: 1, createdAt: 1 })
      .toArray();
  }

  async create(userId: ObjectId, input: CreateTaskInput, now = new Date()): Promise<TaskDocument> {
    const latest = await this.tasks
      .find(byUserFilter<TaskDocument>(userId))
      .sort({ order: -1 })
      .limit(1)
      .next();
    const nextOrder = latest ? midpoint(latest.order, null) : '1.000000';
    const task: TaskDocument = {
      _id: new ObjectId(),
      userId,
      title: input.title,
      dueDate: input.dueDate ?? null,
      priority: input.priority,
      status: input.status,
      estimateMinutes: input.estimateMinutes,
      order: nextOrder,
      ...createRepositoryMetadata(now),
    };

    await this.tasks.insertOne(task);
    return task;
  }

  async update(
    userId: ObjectId,
    id: ObjectId,
    input: UpdateTaskInput,
    now = new Date(),
  ): Promise<TaskDocument> {
    const result = await this.tasks.findOneAndUpdate(
      byUserAndIdFilter<TaskDocument>(userId, id),
      versionedUpdate<TaskDocument>(input as MatchKeysAndValues<TaskDocument>, now),
      { returnDocument: 'after' },
    );

    if (!result) {
      throw new NotFoundError('Task');
    }

    return result;
  }

  async move(
    userId: ObjectId,
    id: ObjectId,
    placement: { beforeId?: ObjectId | null; afterId?: ObjectId | null },
    now = new Date(),
  ): Promise<TaskDocument> {
    const [before, after] = await Promise.all([
      placement.beforeId
        ? this.tasks.findOne(byUserAndIdFilter<TaskDocument>(userId, placement.beforeId))
        : null,
      placement.afterId
        ? this.tasks.findOne(byUserAndIdFilter<TaskDocument>(userId, placement.afterId))
        : null,
    ]);

    return this.update(
      userId,
      id,
      { order: midpoint(after?.order ?? null, before?.order ?? null) },
      now,
    );
  }

  async softDelete(userId: ObjectId, id: ObjectId, now = new Date()): Promise<void> {
    const result = await this.tasks.updateOne(
      byUserAndIdFilter<TaskDocument>(userId, id),
      softDeleteUpdate<TaskDocument>(now),
    );

    if (result.matchedCount === 0) {
      throw new NotFoundError('Task');
    }
  }

  async restore(userId: ObjectId, id: ObjectId, now = new Date()): Promise<TaskDocument> {
    const result = await this.tasks.findOneAndUpdate(
      byUserAndIdFilter<TaskDocument>(userId, id, 'deleted'),
      restoreUpdate<TaskDocument>(now),
      { returnDocument: 'after' },
    );

    if (!result) {
      throw new NotFoundError('Task');
    }

    return result;
  }

  async deleteManyByUser(userId: ObjectId): Promise<void> {
    await this.tasks.deleteMany({ userId });
  }
}
