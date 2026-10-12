import { randomBytes } from 'node:crypto';
import type { ObjectId } from 'mongodb';
import {
  DEMO_ALL_DAY_EVENTS,
  DEMO_BLOCKS,
  DEMO_CALENDARS,
  DEMO_TASKS,
} from '../domain/demo/demo-day.js';
import { localDateOf } from '../domain/time/local-date.js';
import { RateLimitedError } from '../errors/app-error.js';
import { addDays, instantAt } from '../domain/time/zoned-time.js';
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

const DEMO_ACCOUNT_TTL_MS = 24 * 60 * 60 * 1000;

export interface DemoRepositories {
  users: UsersRepository;
  calendars: CalendarsRepository;
  tasks: TasksRepository;
  events: EventsRepository;
}

export class DemoService {
  constructor(
    private readonly repositories: DemoRepositories,
    private readonly authService: AuthService,
    private readonly maxActiveUsers: number,
  ) {}

  async createDemoSession(timeZone = 'UTC', now = new Date()): Promise<AuthSession> {
    // A soft cap: two sign-ins racing past the count can overshoot it by one,
    // which is fine for a limit that only exists to bound storage.
    if ((await this.repositories.users.countActiveDemoUsers(now)) >= this.maxActiveUsers) {
      throw new RateLimitedError('The demo is full right now, please try again in a few minutes');
    }

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

    await this.seedDemoDay(user._id, timeZone, now);
    return this.authService.createSessionForUser(user, now);
  }

  /**
   * Lays the demo day out around today's date in `timeZone`. Calendars and
   * tasks are created one at a time because each takes the next position in
   * its list from the ones already stored.
   */
  private async seedDemoDay(userId: ObjectId, timeZone: string, now: Date): Promise<void> {
    const { calendars, tasks, events } = this.repositories;
    const today = localDateOf(now, timeZone);

    const calendarIds = new Map<string, ObjectId>();
    for (const { key, ...calendar } of DEMO_CALENDARS) {
      const created = await calendars.create(userId, { ...calendar, visible: true }, now);
      calendarIds.set(key, created._id);
    }

    const taskIds = new Map<string, ObjectId>();
    for (const { key, dueInDays, ...task } of DEMO_TASKS) {
      const dueDate = dueInDays === null ? null : addDays(today, dueInDays);
      const created = await tasks.create(userId, { ...task, dueDate }, now);
      taskIds.set(key, created._id);
    }

    const calendarId = (key: string): ObjectId => {
      const id = calendarIds.get(key);
      if (!id) throw new Error(`Demo calendar "${key}" is not defined`);
      return id;
    };

    await Promise.all([
      ...DEMO_BLOCKS.map((block) => {
        const date = addDays(today, block.dayOffset);
        return events.create(
          userId,
          {
            kind: 'timed',
            calendarId: calendarId(block.calendar),
            title: block.title,
            taskId: block.task ? (taskIds.get(block.task) ?? null) : null,
            startUtc: instantAt(date, block.startMinutes, timeZone),
            endUtc: instantAt(date, block.endMinutes, timeZone),
            timeZone,
          },
          now,
        );
      }),
      ...DEMO_ALL_DAY_EVENTS.map((event) => {
        const startDate = addDays(today, event.dayOffset);
        return events.create(
          userId,
          {
            kind: 'allDay',
            calendarId: calendarId(event.calendar),
            title: event.title,
            startDate,
            endDate: addDays(startDate, event.days),
          },
          now,
        );
      }),
    ]);
  }
}
