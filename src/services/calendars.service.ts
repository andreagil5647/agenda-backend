import type { ObjectId } from 'mongodb';
import { toCalendarView, type CalendarView } from '../mappers/calendar.mapper.js';
import { parseObjectId } from '../repositories/base.repository.js';
import type { CalendarsRepository } from '../repositories/calendars.repository.js';
import type {
  CalendarOrderRequest,
  CreateCalendarRequest,
  PatchCalendarRequest,
} from '../schemas/calendars.schemas.js';

export class CalendarsService {
  constructor(private readonly calendars: CalendarsRepository) {}

  async list(userId: ObjectId): Promise<CalendarView[]> {
    const calendars = await this.calendars.listByUser(userId);
    return calendars.map(toCalendarView);
  }

  async create(userId: ObjectId, input: CreateCalendarRequest): Promise<CalendarView> {
    const calendar = await this.calendars.create(userId, input);
    return toCalendarView(calendar);
  }

  async update(userId: ObjectId, id: string, input: PatchCalendarRequest): Promise<CalendarView> {
    const calendar = await this.calendars.update(userId, parseObjectId(id), input);
    return toCalendarView(calendar);
  }

  remove(userId: ObjectId, id: string): Promise<void> {
    return this.calendars.softDelete(userId, parseObjectId(id));
  }

  async reorder(userId: ObjectId, input: CalendarOrderRequest): Promise<CalendarView[]> {
    const calendars = await this.calendars.reorder(
      userId,
      input.calendarIds.map((id) => parseObjectId(id, 'calendarIds')),
    );
    return calendars.map(toCalendarView);
  }
}
