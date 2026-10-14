import {
  MongoServerError,
  ObjectId,
  type Collection,
  type Db,
  type Filter,
  type MatchKeysAndValues,
} from 'mongodb';
import { ConflictError, NotFoundError } from '../errors/app-error.js';
import {
  byIdFilter,
  createRepositoryMetadata,
  softDeleteUpdate,
  versionedUpdate,
  type RepositoryDocument,
} from './base.repository.js';

export interface UserSettings {
  timeZone: string;
  weekStartsOn: 0 | 1 | 6;
  hourCycle: 'h12' | 'h23';
  locale: string;
  theme: 'system' | 'light' | 'dark';
  accentColor: string;
}

export interface UserDocument extends RepositoryDocument {
  email: string;
  passwordHash: string;
  displayName: string;
  settings: UserSettings;
  isDemo: boolean;
  expiresAt?: Date | null;
}

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  displayName: string;
  settings: UserSettings;
  isDemo?: boolean;
  expiresAt?: Date | null;
}

function activeUserFilter(now: Date): Filter<UserDocument> {
  return {
    deletedAt: null,
    $or: [{ expiresAt: null }, { expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }],
  };
}

function isDuplicateKeyError(error: unknown): boolean {
  return error instanceof MongoServerError && error.code === 11000;
}

export class UsersRepository {
  private readonly users: Collection<UserDocument>;

  constructor(db: Db) {
    this.users = db.collection<UserDocument>('users');
  }

  async create(input: CreateUserInput, now = new Date()): Promise<UserDocument> {
    const id = new ObjectId();
    const user: UserDocument = {
      _id: id,
      email: input.email,
      passwordHash: input.passwordHash,
      displayName: input.displayName,
      settings: input.settings,
      isDemo: input.isDemo ?? false,
      expiresAt: input.expiresAt ?? null,
      ...createRepositoryMetadata(now),
    };

    try {
      await this.users.insertOne(user);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictError('Email is already registered', {
          reason: 'email_taken',
          field: 'email',
        });
      }
      throw error;
    }

    return user;
  }

  async findActiveByEmail(email: string, now = new Date()): Promise<UserDocument | null> {
    return this.users.findOne({ email, ...activeUserFilter(now) });
  }

  async findActiveById(id: ObjectId, now = new Date()): Promise<UserDocument | null> {
    return this.users.findOne({ _id: id, ...activeUserFilter(now) });
  }

  async countActiveDemoUsers(now = new Date()): Promise<number> {
    return this.users.countDocuments({ isDemo: true, ...activeUserFilter(now) });
  }

  async updateSettings(
    id: ObjectId,
    settings: Partial<UserSettings>,
    now = new Date(),
  ): Promise<UserDocument> {
    const result = await this.users.findOneAndUpdate(
      byIdFilter<UserDocument>(id),
      versionedUpdate<UserDocument>(
        Object.fromEntries(
          Object.entries(settings).map(([key, value]) => [`settings.${key}`, value]),
        ) as MatchKeysAndValues<UserDocument>,
        now,
      ),
      { returnDocument: 'after' },
    );

    if (!result) {
      throw new NotFoundError('User');
    }

    return result;
  }

  async softDelete(id: ObjectId, now = new Date()): Promise<void> {
    const result = await this.users.updateOne(
      byIdFilter<UserDocument>(id),
      softDeleteUpdate<UserDocument>(now),
    );

    if (result.matchedCount === 0) {
      throw new NotFoundError('User');
    }
  }
}
