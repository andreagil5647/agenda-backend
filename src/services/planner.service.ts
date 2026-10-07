import type { ObjectId } from 'mongodb';
import { NotFoundError } from '../errors/app-error.js';
import {
  toCalendarView,
  type CalendarView,
  type CalendarsRepository,
} from '../repositories/calendars.repository.js';
import type { SessionsRepository } from '../repositories/sessions.repository.js';
import {
  toTaskView,
  type TasksRepository,
  type TaskView,
} from '../repositories/tasks.repository.js';
import {
  toUserView,
  type UsersRepository,
  type UserView,
} from '../repositories/users.repository.js';
import { parseObjectId } from '../repositories/base.repository.js';
import type {
  CalendarOrderRequest,
  CreateCalendarRequest,
  CreateTaskRequest,
  MoveTaskRequest,
  PatchCalendarRequest,
  PatchSettingsRequest,
  PatchTaskRequest,
  TasksQuery,
} from '../schemas/planner.schemas.js';

export interface PlannerRepositories {
  users: UsersRepository;
  sessions: SessionsRepository;
  calendars: CalendarsRepository;
  tasks: TasksRepository;
}

export class PlannerService {
  constructor(private readonly repositories: PlannerRepositories) {}

  getMe(userId: ObjectId): Promise<UserView> {
    return this.requireUser(userId);
  }

  async updateSettings(userId: ObjectId, input: PatchSettingsRequest): Promise<UserView> {
    const user = await this.repositories.users.updateSettings(userId, input);
    return toUserView(user);
  }

  async deleteAccount(userId: ObjectId): Promise<void> {
    await Promise.all([
      this.repositories.sessions.deleteManyByUser(userId),
      this.repositories.calendars.deleteManyByUser(userId),
      this.repositories.tasks.deleteManyByUser(userId),
    ]);
    await this.repositories.users.softDelete(userId);
  }

  listCalendars(userId: ObjectId): Promise<CalendarView[]> {
    return this.repositories.calendars
      .listByUser(userId)
      .then((calendars) => calendars.map(toCalendarView));
  }

  async createCalendar(userId: ObjectId, input: CreateCalendarRequest): Promise<CalendarView> {
    const calendar = await this.repositories.calendars.create(userId, input);
    return toCalendarView(calendar);
  }

  async updateCalendar(
    userId: ObjectId,
    id: string,
    input: PatchCalendarRequest,
  ): Promise<CalendarView> {
    const calendar = await this.repositories.calendars.update(userId, parseObjectId(id), input);
    return toCalendarView(calendar);
  }

  deleteCalendar(userId: ObjectId, id: string): Promise<void> {
    return this.repositories.calendars.softDelete(userId, parseObjectId(id));
  }

  async reorderCalendars(userId: ObjectId, input: CalendarOrderRequest): Promise<CalendarView[]> {
    const calendars = await this.repositories.calendars.reorder(
      userId,
      input.calendarIds.map((id) => parseObjectId(id, 'calendarIds')),
    );
    return calendars.map(toCalendarView);
  }

  listTasks(userId: ObjectId, query: TasksQuery): Promise<TaskView[]> {
    return this.repositories.tasks.listByUser(userId, query).then((tasks) => tasks.map(toTaskView));
  }

  async createTask(userId: ObjectId, input: CreateTaskRequest): Promise<TaskView> {
    const task = await this.repositories.tasks.create(userId, input);
    return toTaskView(task);
  }

  async updateTask(userId: ObjectId, id: string, input: PatchTaskRequest): Promise<TaskView> {
    const task = await this.repositories.tasks.update(userId, parseObjectId(id), input);
    return toTaskView(task);
  }

  deleteTask(userId: ObjectId, id: string): Promise<void> {
    return this.repositories.tasks.softDelete(userId, parseObjectId(id));
  }

  async restoreTask(userId: ObjectId, id: string): Promise<TaskView> {
    const task = await this.repositories.tasks.restore(userId, parseObjectId(id));
    return toTaskView(task);
  }

  async moveTask(userId: ObjectId, id: string, input: MoveTaskRequest): Promise<TaskView> {
    const task = await this.repositories.tasks.move(userId, parseObjectId(id), {
      beforeId: input.beforeId ? parseObjectId(input.beforeId, 'beforeId') : null,
      afterId: input.afterId ? parseObjectId(input.afterId, 'afterId') : null,
    });
    return toTaskView(task);
  }

  private async requireUser(userId: ObjectId): Promise<UserView> {
    const user = await this.repositories.users.findActiveById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }
    return toUserView(user);
  }
}
