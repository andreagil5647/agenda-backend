import { randomBytes } from 'node:crypto';
import type { ObjectId } from 'mongodb';
import type { CalendarsRepository } from '../repositories/calendars.repository.js';
import type { EventsRepository } from '../repositories/events.repository.js';
import type { TasksRepository } from '../repositories/tasks.repository.js';
import type { UsersRepository } from '../repositories/users.repository.js';
import {
  defaultUserSettings,
  hashPassword,
  type AuthService,
  type AuthSession,
} from './auth.service.js';

const HOUR_MS = 60 * 60 * 1000;
const DEMO_ACCOUNT_TTL_MS = 24 * HOUR_MS;

export interface DemoRepositories {
  users: UsersRepository;
  calendars: CalendarsRepository;
  tasks: TasksRepository;
  events: EventsRepository;
}

function toIsoDate(instant: Date): string {
  return instant.toISOString().slice(0, 10);
}

export class DemoService {
  constructor(
    private readonly repositories: DemoRepositories,
    private readonly authService: AuthService,
  ) {}

  async createDemoSession(timeZone = 'UTC', now = new Date()): Promise<AuthSession> {
    const user = await this.repositories.users.create(
      {
        email: `demo-${randomBytes(4).toString('hex')}@demo.agenda.local`,
        passwordHash: await hashPassword(randomBytes(24).toString('base64url')),
        displayName: 'Demo User',
        settings: defaultUserSettings(timeZone),
        isDemo: true,
        expiresAt: new Date(now.getTime() + DEMO_ACCOUNT_TTL_MS),
      },
      now,
    );

    await this.seedPlanner(user._id, timeZone, now);
    return this.authService.createSessionForUser(user, now);
  }

  private async seedPlanner(userId: ObjectId, timeZone: string, now: Date): Promise<void> {
    const { calendars, tasks, events } = this.repositories;
    const today = toIsoDate(now);

    const work = await calendars.create(userId, {
      name: 'Work',
      colorKey: 'blue',
      visible: true,
      defaultReminderMinutes: [10],
    });
    const personal = await calendars.create(userId, {
      name: 'Personal',
      colorKey: 'green',
      visible: true,
      defaultReminderMinutes: [],
    });
    const checklist = await tasks.create(userId, {
      title: 'Draft launch checklist',
      dueDate: today,
      priority: 'high',
      status: 'todo',
      estimateMinutes: 60,
    });
    await tasks.create(userId, {
      title: 'Review calendar layout',
      dueDate: today,
      priority: 'medium',
      status: 'todo',
      estimateMinutes: 30,
    });
    await events.create(userId, {
      kind: 'timed',
      calendarId: work._id,
      title: 'Focus block',
      taskId: checklist._id,
      startUtc: new Date(now.getTime() + HOUR_MS),
      endUtc: new Date(now.getTime() + 2 * HOUR_MS),
      timeZone,
    });
    await events.create(userId, {
      kind: 'allDay',
      calendarId: personal._id,
      title: 'Keep evening free',
      startDate: today,
      endDate: toIsoDate(new Date(now.getTime() + 24 * HOUR_MS)),
    });
  }
}
