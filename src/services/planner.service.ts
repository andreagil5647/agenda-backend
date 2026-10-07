import { randomBytes } from 'node:crypto';
import type { ObjectId } from 'mongodb';
import { BadRequestError, NotFoundError } from '../errors/app-error.js';
import {
  toCalendarView,
  type CalendarView,
  type CalendarsRepository,
} from '../repositories/calendars.repository.js';
import {
  toEventView,
  type EventsRepository,
  type EventView,
  type UpdateEventInput,
} from '../repositories/events.repository.js';
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
import { hashPassword, type AuthService, type AuthSession } from './auth.service.js';
import { parseObjectId } from '../repositories/base.repository.js';
import type {
  CalendarOrderRequest,
  CreateCalendarRequest,
  CreateEventRequest,
  CreateTaskRequest,
  EventsQuery,
  MoveTaskRequest,
  PatchCalendarRequest,
  PatchEventRequest,
  PatchSettingsRequest,
  PatchTaskRequest,
  TasksQuery,
} from '../schemas/planner.schemas.js';

export interface PlannerRepositories {
  users: UsersRepository;
  sessions: SessionsRepository;
  calendars: CalendarsRepository;
  tasks: TasksRepository;
  events: EventsRepository;
}

export class PlannerService {
  constructor(
    private readonly repositories: PlannerRepositories,
    private readonly authService: AuthService,
  ) {}

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
      this.repositories.events.deleteManyByUser(userId),
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

  async listEvents(userId: ObjectId, query: EventsQuery): Promise<EventView[]> {
    const from = new Date(query.from);
    const to = new Date(query.to);
    if (to <= from) {
      throw new BadRequestError('Event range end must be after start');
    }

    const events = await this.repositories.events.listByRange(userId, {
      from,
      to,
      calendarIds: query.calendarIds?.map((id) => parseObjectId(id, 'calendarIds')),
    });
    return events.map(toEventView);
  }

  async createEvent(userId: ObjectId, input: CreateEventRequest): Promise<EventView> {
    await this.requireCalendar(userId, input.calendarId);
    const event = await this.repositories.events.create(userId, this.toCreateEventInput(input));
    return toEventView(event);
  }

  async updateEvent(userId: ObjectId, id: string, input: PatchEventRequest): Promise<EventView> {
    if (input.calendarId) {
      await this.requireCalendar(userId, input.calendarId);
    }

    const event = await this.repositories.events.update(
      userId,
      parseObjectId(id),
      this.toUpdateEventInput(input),
    );
    return toEventView(event);
  }

  deleteEvent(userId: ObjectId, id: string): Promise<void> {
    return this.repositories.events.softDelete(userId, parseObjectId(id));
  }

  async createDemoSession(now = new Date()): Promise<AuthSession> {
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const suffix = randomBytes(4).toString('hex');
    const user = await this.repositories.users.create(
      {
        email: `demo-${suffix}@demo.agenda.local`,
        passwordHash: await hashPassword(randomBytes(24).toString('base64url')),
        displayName: 'Demo User',
        settings: {
          timeZone: 'Europe/Madrid',
          weekStartsOn: 1,
          hourCycle: 'h23',
          locale: 'en',
          theme: 'system',
          accentColor: 'blue',
        },
        isDemo: true,
        expiresAt,
      },
      now,
    );

    await seedDemoData(user._id, this.repositories, now);
    return this.authService.createSessionForUser(user, now);
  }

  private async requireUser(userId: ObjectId): Promise<UserView> {
    const user = await this.repositories.users.findActiveById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }
    return toUserView(user);
  }

  private async requireCalendar(userId: ObjectId, calendarId: string): Promise<void> {
    const calendar = await this.repositories.calendars.findByUserAndId(
      userId,
      parseObjectId(calendarId, 'calendarId'),
    );
    if (!calendar) {
      throw new NotFoundError('Calendar');
    }
  }

  private toCreateEventInput(input: CreateEventRequest) {
    if (input.kind === 'timed') {
      const startUtc = new Date(input.startUtc);
      const endUtc = new Date(input.endUtc);
      if (endUtc <= startUtc) {
        throw new BadRequestError('Event end must be after start');
      }
      return {
        kind: input.kind,
        calendarId: parseObjectId(input.calendarId, 'calendarId'),
        title: input.title,
        notes: input.notes ?? null,
        taskId: input.taskId ? parseObjectId(input.taskId, 'taskId') : null,
        startUtc,
        endUtc,
        timeZone: input.timeZone,
      } as const;
    }

    if (input.endDate <= input.startDate) {
      throw new BadRequestError('Event end date must be after start date');
    }

    return {
      kind: input.kind,
      calendarId: parseObjectId(input.calendarId, 'calendarId'),
      title: input.title,
      notes: input.notes ?? null,
      taskId: input.taskId ? parseObjectId(input.taskId, 'taskId') : null,
      startDate: input.startDate,
      endDate: input.endDate,
    } as const;
  }

  private toUpdateEventInput(input: PatchEventRequest): UpdateEventInput {
    const update: UpdateEventInput = {};
    if (input.title !== undefined) update.title = input.title;
    if (input.notes !== undefined) update.notes = input.notes;
    if (input.calendarId !== undefined)
      update.calendarId = parseObjectId(input.calendarId, 'calendarId');
    if (input.taskId !== undefined)
      update.taskId = input.taskId ? parseObjectId(input.taskId, 'taskId') : null;
    if (input.startUtc !== undefined) update.startUtc = new Date(input.startUtc);
    if (input.endUtc !== undefined) update.endUtc = new Date(input.endUtc);
    if (input.timeZone !== undefined) update.timeZone = input.timeZone;
    if (input.startDate !== undefined) update.startDate = input.startDate;
    if (input.endDate !== undefined) update.endDate = input.endDate;
    return update;
  }
}

export async function seedDemoData(
  userId: ObjectId,
  repositories: Pick<PlannerRepositories, 'calendars' | 'tasks' | 'events'>,
  now = new Date(),
): Promise<void> {
  const today = now.toISOString().slice(0, 10);
  const work = await repositories.calendars.create(userId, {
    name: 'Work',
    colorKey: 'blue',
    visible: true,
    defaultReminderMinutes: [10],
  });
  const personal = await repositories.calendars.create(userId, {
    name: 'Personal',
    colorKey: 'green',
    visible: true,
    defaultReminderMinutes: [],
  });
  const task = await repositories.tasks.create(userId, {
    title: 'Draft launch checklist',
    dueDate: today,
    priority: 'high',
    status: 'todo',
    estimateMinutes: 60,
  });

  await repositories.tasks.create(userId, {
    title: 'Review calendar layout',
    dueDate: today,
    priority: 'medium',
    status: 'todo',
    estimateMinutes: 30,
  });
  await repositories.events.create(userId, {
    kind: 'timed',
    calendarId: work._id,
    title: 'Focus block',
    taskId: task._id,
    startUtc: new Date(now.getTime() + 60 * 60 * 1000),
    endUtc: new Date(now.getTime() + 2 * 60 * 60 * 1000),
    timeZone: 'Europe/Madrid',
  });
  await repositories.events.create(userId, {
    kind: 'allDay',
    calendarId: personal._id,
    title: 'Keep evening free',
    startDate: today,
    endDate: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  });
}
