import { ObjectId, type Collection, type Db, type Filter, type MatchKeysAndValues } from 'mongodb';
import { NotFoundError } from '../errors/app-error.js';
import {
  byUserAndIdFilter,
  byUserFilter,
  createRepositoryMetadata,
  softDeleteUpdate,
  versionedUpdate,
  type UserOwnedRepositoryDocument,
} from './base.repository.js';

export interface EventDocument extends UserOwnedRepositoryDocument {
  calendarId: ObjectId;
  title: string;
  notes: string | null;
  taskId: ObjectId | null;
  kind: 'timed' | 'allDay';
  startUtc: Date | null;
  endUtc: Date | null;
  timeZone: string | null;
  startDate: string | null;
  endDate: string | null;
}

export type CreateEventInput =
  | {
      kind: 'timed';
      calendarId: ObjectId;
      title: string;
      notes?: string | null;
      taskId?: ObjectId | null;
      startUtc: Date;
      endUtc: Date;
      timeZone: string;
    }
  | {
      kind: 'allDay';
      calendarId: ObjectId;
      title: string;
      notes?: string | null;
      taskId?: ObjectId | null;
      startDate: string;
      endDate: string;
    };

export type UpdateEventInput = Partial<Omit<EventDocument, keyof UserOwnedRepositoryDocument>>;

export interface EventRange {
  from: Date;
  to: Date;
  calendarIds?: ObjectId[];
}

export class EventsRepository {
  private readonly events: Collection<EventDocument>;

  constructor(db: Db) {
    this.events = db.collection<EventDocument>('events');
  }

  async listByRange(userId: ObjectId, range: EventRange): Promise<EventDocument[]> {
    const fromDate = range.from.toISOString().slice(0, 10);
    const toDate = range.to.toISOString().slice(0, 10);
    const filter: Filter<EventDocument> = {
      $or: [
        { kind: 'timed', startUtc: { $lt: range.to }, endUtc: { $gt: range.from } },
        { kind: 'allDay', startDate: { $lt: toDate }, endDate: { $gt: fromDate } },
      ],
    };

    if (range.calendarIds?.length) {
      filter.calendarId = { $in: range.calendarIds };
    }

    return this.events
      .find(byUserFilter<EventDocument>(userId, filter))
      .sort({ startUtc: 1, startDate: 1 })
      .toArray();
  }

  async create(
    userId: ObjectId,
    input: CreateEventInput,
    now = new Date(),
  ): Promise<EventDocument> {
    const event: EventDocument = {
      _id: new ObjectId(),
      userId,
      calendarId: input.calendarId,
      title: input.title,
      notes: input.notes ?? null,
      taskId: input.taskId ?? null,
      kind: input.kind,
      startUtc: input.kind === 'timed' ? input.startUtc : null,
      endUtc: input.kind === 'timed' ? input.endUtc : null,
      timeZone: input.kind === 'timed' ? input.timeZone : null,
      startDate: input.kind === 'allDay' ? input.startDate : null,
      endDate: input.kind === 'allDay' ? input.endDate : null,
      ...createRepositoryMetadata(now),
    };

    await this.events.insertOne(event);
    return event;
  }

  async update(
    userId: ObjectId,
    id: ObjectId,
    input: UpdateEventInput,
    now = new Date(),
  ): Promise<EventDocument> {
    const result = await this.events.findOneAndUpdate(
      byUserAndIdFilter<EventDocument>(userId, id),
      versionedUpdate<EventDocument>(input as MatchKeysAndValues<EventDocument>, now),
      { returnDocument: 'after' },
    );

    if (!result) {
      throw new NotFoundError('Event');
    }

    return result;
  }

  async softDelete(userId: ObjectId, id: ObjectId, now = new Date()): Promise<void> {
    const result = await this.events.updateOne(
      byUserAndIdFilter<EventDocument>(userId, id),
      softDeleteUpdate<EventDocument>(now),
    );

    if (result.matchedCount === 0) {
      throw new NotFoundError('Event');
    }
  }

  async deleteManyByUser(userId: ObjectId): Promise<void> {
    await this.events.deleteMany({ userId });
  }
}
