import type { ObjectId } from 'mongodb';
import { findSchedulePatchProblem } from '../domain/events/schedule.js';
import { localDateSpan } from '../domain/time/local-date.js';
import { BadRequestError, NotFoundError } from '../errors/app-error.js';
import { toEventView, type EventView } from '../mappers/event.mapper.js';
import { parseObjectId, versionConflictError } from '../repositories/base.repository.js';
import type { CalendarsRepository } from '../repositories/calendars.repository.js';
import type {
  CreateEventInput,
  EventDocument,
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

const END_NOT_AFTER_START = 'Event end must be after start';
const END_NOT_AFTER_START_DETAILS = { reason: 'end_not_after_start' } as const;

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
      throw new BadRequestError(END_NOT_AFTER_START, END_NOT_AFTER_START_DETAILS);
    }
    return { ...shared, kind: input.kind, startUtc, endUtc, timeZone: input.timeZone };
  }

  if (input.endDate <= input.startDate) {
    throw new BadRequestError(END_NOT_AFTER_START, END_NOT_AFTER_START_DETAILS);
  }
  return { ...shared, kind: input.kind, startDate: input.startDate, endDate: input.endDate };
}

function assertPatchFitsEvent(event: EventDocument, update: UpdateEventInput): void {
  const problem = findSchedulePatchProblem(event.kind, event, update);
  if (problem?.reason === 'fields_of_other_kind') {
    const kind = event.kind === 'timed' ? 'a timed' : 'an all-day';
    throw new BadRequestError(`${problem.fields.join(', ')} cannot be set on ${kind} event`, {
      reason: problem.reason,
      fields: problem.fields,
    });
  }
  if (problem) {
    throw new BadRequestError(END_NOT_AFTER_START, END_NOT_AFTER_START_DETAILS);
  }
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

  async listInRange(userId: ObjectId, query: EventsQuery, timeZone: string): Promise<EventView[]> {
    const from = new Date(query.from);
    const to = new Date(query.to);
    if (to <= from) {
      throw new BadRequestError('Event range end must be after start');
    }

    const events = await this.repositories.events.listByRange(userId, {
      from,
      to,
      dates: localDateSpan(from, to, timeZone),
      calendarIds: query.calendarIds?.map((id) => parseObjectId(id, 'calendarIds')),
    });
    return events.map(toEventView);
  }

  async create(userId: ObjectId, input: CreateEventRequest): Promise<EventView> {
    await this.requireCalendar(userId, input.calendarId);
    const event = await this.repositories.events.create(userId, toCreateEventInput(input));
    return toEventView(event);
  }

  async update(
    userId: ObjectId,
    id: string,
    input: PatchEventRequest,
    expectedVersion: number,
  ): Promise<EventView> {
    const eventId = parseObjectId(id);
    const current = await this.repositories.events.findByUserAndId(userId, eventId);
    if (!current) {
      throw new NotFoundError('Event');
    }
    // The rules below are checked against the stored event, so it has to be
    // the version the client was looking at.
    if (current.version !== expectedVersion) {
      throw versionConflictError('Event');
    }

    const update = toUpdateEventInput(input);
    assertPatchFitsEvent(current, update);
    if (input.calendarId) {
      await this.requireCalendar(userId, input.calendarId);
    }

    const event = await this.repositories.events.update(userId, eventId, update, expectedVersion);
    return toEventView(event);
  }

  remove(userId: ObjectId, id: string, expectedVersion: number): Promise<void> {
    return this.repositories.events.softDelete(userId, parseObjectId(id), expectedVersion);
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
