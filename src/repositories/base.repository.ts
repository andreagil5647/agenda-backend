import {
  ObjectId,
  type Collection,
  type Filter,
  type MatchKeysAndValues,
  type UpdateFilter,
} from 'mongodb';
import {
  BadRequestError,
  NotFoundError,
  PreconditionFailedError,
  type AppError,
} from '../errors/app-error.js';

const OBJECT_ID_HEX = /^[0-9a-f]{24}$/i;

export const FIRST_DOCUMENT_VERSION = 1;

export interface RepositoryDocument {
  _id: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  deletedAt?: Date | null;
}

export interface UserOwnedRepositoryDocument extends RepositoryDocument {
  userId: ObjectId;
}

export type SoftDeleteVisibility = 'active' | 'deleted' | 'all';

export interface RepositoryMetadata {
  createdAt: Date;
  updatedAt: Date;
  version: number;
  deletedAt: null;
}

function cloneDate(value: Date): Date {
  return new Date(value.getTime());
}

function assertPositiveVersion(value: number, fieldName: string): void {
  if (!Number.isSafeInteger(value) || value < FIRST_DOCUMENT_VERSION) {
    throw new BadRequestError(`${fieldName} must be a positive integer`, {
      [fieldName]: 'Expected an integer greater than zero',
    });
  }
}

function asRepositoryFilter<TDocument extends RepositoryDocument>(
  filter: object,
): Filter<TDocument> {
  return filter;
}

function combineFilters<TDocument extends RepositoryDocument>(
  ...filters: Filter<TDocument>[]
): Filter<TDocument> {
  const nonEmpty = filters.filter((filter) => Object.keys(filter).length > 0);

  if (nonEmpty.length === 0) {
    return {};
  }
  if (nonEmpty.length === 1) {
    return nonEmpty[0] ?? {};
  }

  return asRepositoryFilter({ $and: nonEmpty });
}

export function parseObjectId(value: string, fieldName = 'id'): ObjectId {
  const trimmed = value.trim();

  if (!OBJECT_ID_HEX.test(trimmed)) {
    throw new BadRequestError(`Invalid ${fieldName}`, {
      [fieldName]: 'Expected a 24-character hexadecimal ObjectId',
    });
  }

  return new ObjectId(trimmed);
}

export function objectIdToString(value: ObjectId): string {
  return value.toHexString();
}

export function createRepositoryMetadata(now = new Date()): RepositoryMetadata {
  const timestamp = cloneDate(now);

  return {
    createdAt: cloneDate(timestamp),
    updatedAt: cloneDate(timestamp),
    version: FIRST_DOCUMENT_VERSION,
    deletedAt: null,
  };
}

export function withSoftDeleteFilter<TDocument extends RepositoryDocument>(
  filter: Filter<TDocument> = {},
  visibility: SoftDeleteVisibility = 'active',
): Filter<TDocument> {
  if (visibility === 'all') {
    return filter;
  }

  const softDeleteFilter =
    visibility === 'active'
      ? asRepositoryFilter<TDocument>({ deletedAt: null })
      : asRepositoryFilter<TDocument>({ deletedAt: { $exists: true, $ne: null } });

  return combineFilters(filter, softDeleteFilter);
}

export function byIdFilter<TDocument extends RepositoryDocument>(
  id: ObjectId,
  visibility: SoftDeleteVisibility = 'active',
): Filter<TDocument> {
  return withSoftDeleteFilter(asRepositoryFilter<TDocument>({ _id: id }), visibility);
}

export function byUserFilter<TDocument extends UserOwnedRepositoryDocument>(
  userId: ObjectId,
  filter: Filter<TDocument> = {},
  visibility: SoftDeleteVisibility = 'active',
): Filter<TDocument> {
  return withSoftDeleteFilter(
    combineFilters(filter, asRepositoryFilter<TDocument>({ userId })),
    visibility,
  );
}

export function byUserAndIdFilter<TDocument extends UserOwnedRepositoryDocument>(
  userId: ObjectId,
  id: ObjectId,
  visibility: SoftDeleteVisibility = 'active',
): Filter<TDocument> {
  return byUserFilter(userId, asRepositoryFilter<TDocument>({ _id: id }), visibility);
}

export function withExpectedVersion<TDocument extends RepositoryDocument>(
  filter: Filter<TDocument>,
  expectedVersion: number,
): Filter<TDocument> {
  assertPositiveVersion(expectedVersion, 'expectedVersion');

  return combineFilters(filter, asRepositoryFilter<TDocument>({ version: expectedVersion }));
}

export function versionedUpdate<TDocument extends RepositoryDocument>(
  set: MatchKeysAndValues<TDocument>,
  now = new Date(),
): UpdateFilter<TDocument> {
  return {
    $set: {
      ...set,
      updatedAt: cloneDate(now),
    } as MatchKeysAndValues<TDocument>,
    $inc: { version: 1 } as unknown as UpdateFilter<TDocument>['$inc'],
  };
}

export function softDeleteUpdate<TDocument extends RepositoryDocument>(
  now = new Date(),
): UpdateFilter<TDocument> {
  return versionedUpdate<TDocument>(
    { deletedAt: cloneDate(now) } as MatchKeysAndValues<TDocument>,
    now,
  );
}

export function restoreUpdate<TDocument extends RepositoryDocument>(
  now = new Date(),
): UpdateFilter<TDocument> {
  return versionedUpdate<TDocument>({ deletedAt: null } as MatchKeysAndValues<TDocument>, now);
}

export function versionConflictError(resource = 'Resource'): PreconditionFailedError {
  return new PreconditionFailedError(`${resource} was changed by another request`, {
    reason: 'stale_version',
  });
}

/**
 * Explains a versioned write that matched nothing: the document is missing
 * (or belongs to someone else), or it has moved on from the expected version.
 */
export async function unmatchedWriteError<TDocument extends UserOwnedRepositoryDocument>(
  collection: Collection<TDocument>,
  userId: ObjectId,
  id: ObjectId,
  resource: string,
): Promise<AppError> {
  const found = await collection.countDocuments(byUserAndIdFilter<TDocument>(userId, id), {
    limit: 1,
  });
  return found > 0 ? versionConflictError(resource) : new NotFoundError(resource);
}
