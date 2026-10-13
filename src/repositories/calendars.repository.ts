import { ObjectId, type Collection, type Db, type MatchKeysAndValues } from 'mongodb';
import { NotFoundError } from '../errors/app-error.js';
import {
  byUserAndIdFilter,
  byUserFilter,
  createRepositoryMetadata,
  objectIdToString,
  softDeleteUpdate,
  versionedUpdate,
  type UserOwnedRepositoryDocument,
} from './base.repository.js';

export interface CalendarDocument extends UserOwnedRepositoryDocument {
  name: string;
  colorKey: string;
  visible: boolean;
  defaultReminderMinutes: number[];
  order: number;
}

export interface CreateCalendarInput {
  name: string;
  colorKey: string;
  visible: boolean;
  defaultReminderMinutes: number[];
}

export type UpdateCalendarInput = Partial<CreateCalendarInput>;

export class CalendarsRepository {
  private readonly calendars: Collection<CalendarDocument>;

  constructor(db: Db) {
    this.calendars = db.collection<CalendarDocument>('calendars');
  }

  async listByUser(userId: ObjectId): Promise<CalendarDocument[]> {
    return this.calendars.find(byUserFilter<CalendarDocument>(userId)).sort({ order: 1 }).toArray();
  }

  async create(
    userId: ObjectId,
    input: CreateCalendarInput,
    now = new Date(),
  ): Promise<CalendarDocument> {
    const order = await this.nextOrder(userId);
    const calendar: CalendarDocument = {
      _id: new ObjectId(),
      userId,
      name: input.name,
      colorKey: input.colorKey,
      visible: input.visible,
      defaultReminderMinutes: input.defaultReminderMinutes,
      order,
      ...createRepositoryMetadata(now),
    };

    await this.calendars.insertOne(calendar);
    return calendar;
  }

  async findByUserAndId(userId: ObjectId, id: ObjectId): Promise<CalendarDocument | null> {
    return this.calendars.findOne(byUserAndIdFilter<CalendarDocument>(userId, id));
  }

  async update(
    userId: ObjectId,
    id: ObjectId,
    input: UpdateCalendarInput,
    now = new Date(),
  ): Promise<CalendarDocument> {
    const update = versionedUpdate<CalendarDocument>(
      input as MatchKeysAndValues<CalendarDocument>,
      now,
    );
    const result = await this.calendars.findOneAndUpdate(
      byUserAndIdFilter<CalendarDocument>(userId, id),
      update,
      { returnDocument: 'after' },
    );

    if (!result) {
      throw new NotFoundError('Calendar');
    }

    return result;
  }

  async softDelete(userId: ObjectId, id: ObjectId, now = new Date()): Promise<void> {
    const result = await this.calendars.updateOne(
      byUserAndIdFilter<CalendarDocument>(userId, id),
      softDeleteUpdate<CalendarDocument>(now),
    );

    if (result.matchedCount === 0) {
      throw new NotFoundError('Calendar');
    }
  }

  async reorder(userId: ObjectId, ids: ObjectId[], now = new Date()): Promise<CalendarDocument[]> {
    const calendars = await this.listByUser(userId);
    const existing = new Map(
      calendars.map((calendar) => [objectIdToString(calendar._id), calendar]),
    );
    const orderedIds = ids.map((id) => objectIdToString(id));

    if (orderedIds.some((id) => !existing.has(id)) || existing.size !== orderedIds.length) {
      throw new NotFoundError('Calendar');
    }

    await Promise.all(
      ids.map((id, index) =>
        this.calendars.updateOne(
          byUserAndIdFilter<CalendarDocument>(userId, id),
          versionedUpdate<CalendarDocument>(
            { order: index } as MatchKeysAndValues<CalendarDocument>,
            now,
          ),
        ),
      ),
    );

    return this.listByUser(userId);
  }

  async deleteManyByUser(userId: ObjectId): Promise<void> {
    await this.calendars.deleteMany({ userId });
  }

  private async nextOrder(userId: ObjectId): Promise<number> {
    const latest = await this.calendars
      .find(byUserFilter<CalendarDocument>(userId))
      .sort({ order: -1 })
      .limit(1)
      .next();

    return latest ? latest.order + 1 : 0;
  }
}
