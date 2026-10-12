import type { ObjectId } from 'mongodb';
import { BadRequestError, NotFoundError } from '../errors/app-error.js';
import { toEventView, type EventView } from '../mappers/event.mapper.js';
import { parseObjectId } from '../repositories/base.repository.js';
import type { CalendarsRepository } from '../repositories/calendars.repository.js';
import type {
  CreateEventInput,
  EventsRepository,
  UpdateEventInput,
} from '../repositories/events.repository.js';
import type {
  CreateEventRequest,
  EventsQuery,
  PatchEventRequest,
} from '../schemas/events.schemas.js';

export interface EventsRepositories {
  events: EventsRepository;
  calendars: CalendarsRepository;
}

function toCreateEventInput(input: CreateEventRequest): CreateEventInput {
  const shared = {
    calendarId: parseObjectId(input.calendarId, 'calendarId'),
    title: input.title,
    notes: input.notes ?? null,
    taskId: input.taskId ? parseObjectId(input.taskId, 'taskId') : null,
  };

  if (input.kind === 'timed') {
    const startUtc = new Date(input.startUtc);
    const endUtc = new Date(input.endUtc);
    if (endUtc <= startUtc) {
      throw new BadRequestError('Event end must be after start');
    }
    return { ...shared, kind: input.kind, startUtc, endUtc, timeZone: input.timeZone };
  }

  if (input.endDate <= input.startDate) {
    throw new BadRequestError('Event end date must be after start date');
  }
  return { ...shared, kind: input.kind, startDate: input.startDate, endDate: input.endDate };
}

function toUpdateEventInput(input: PatchEventRequest): UpdateEventInput {
  const update: UpdateEventInput = {};
  if (input.title !== undefined) update.title = input.title;
  if (input.notes !== undefined) update.notes = input.notes;
  if (input.calendarId !== undefined) {
    update.calendarId = parseObjectId(input.calendarId, 'calendarId');
  }
  if (input.taskId !== undefined) {
    update.taskId = input.taskId ? parseObjectId(input.taskId, 'taskId') : null;
  }
  if (input.startUtc !== undefined) update.startUtc = new Date(input.startUtc);
  if (input.endUtc !== undefined) update.endUtc = new Date(input.endUtc);
  if (input.timeZone !== undefined) update.timeZone = input.timeZone;
  if (input.startDate !== undefined) update.startDate = input.startDate;
  if (input.endDate !== undefined) update.endDate = input.endDate;
  return update;
}

export class EventsService {
  constructor(private readonly repositories: EventsRepositories) {}

  async listInRange(userId: ObjectId, query: EventsQuery): Promise<EventView[]> {
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

  async create(userId: ObjectId, input: CreateEventRequest): Promise<EventView> {
    await this.requireCalendar(userId, input.calendarId);
    const event = await this.repositories.events.create(userId, toCreateEventInput(input));
    return toEventView(event);
  }

  async update(userId: ObjectId, id: string, input: PatchEventRequest): Promise<EventView> {
    if (input.calendarId) {
      await this.requireCalendar(userId, input.calendarId);
    }

    const event = await this.repositories.events.update(
      userId,
      parseObjectId(id),
      toUpdateEventInput(input),
    );
    return toEventView(event);
  }

  remove(userId: ObjectId, id: string): Promise<void> {
    return this.repositories.events.softDelete(userId, parseObjectId(id));
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
}
