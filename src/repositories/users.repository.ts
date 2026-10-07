import { MongoServerError, ObjectId, type Collection, type Db, type Filter } from 'mongodb';
import { ConflictError } from '../errors/app-error.js';
import {
  createRepositoryMetadata,
  objectIdToString,
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

export interface UserView {
  id: string;
  email: string;
  displayName: string;
  settings: UserSettings;
  isDemo: boolean;
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

export function toUserView(user: UserDocument): UserView {
  return {
    id: objectIdToString(user._id),
    email: user.email,
    displayName: user.displayName,
    settings: user.settings,
    isDemo: user.isDemo,
  };
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
        throw new ConflictError('Email is already registered', { field: 'email' });
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
}
