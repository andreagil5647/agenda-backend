import type { ObjectId } from 'mongodb';
import { NotFoundError } from '../errors/app-error.js';
import {
  toCalendarView,
  type CalendarView,
  type CalendarsRepository,
} from '../repositories/calendars.repository.js';
import type { SessionsRepository } from '../repositories/sessions.repository.js';
import {
  toUserView,
  type UsersRepository,
  type UserView,
} from '../repositories/users.repository.js';
import { parseObjectId } from '../repositories/base.repository.js';
import type {
  CalendarOrderRequest,
  CreateCalendarRequest,
  PatchCalendarRequest,
  PatchSettingsRequest,
} from '../schemas/planner.schemas.js';

export interface PlannerRepositories {
  users: UsersRepository;
  sessions: SessionsRepository;
  calendars: CalendarsRepository;
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

  private async requireUser(userId: ObjectId): Promise<UserView> {
    const user = await this.repositories.users.findActiveById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }
    return toUserView(user);
  }
}
