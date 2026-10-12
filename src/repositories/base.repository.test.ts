import { ObjectId, type Filter, type MatchKeysAndValues } from 'mongodb';
import { describe, expect, it } from 'vitest';
import { BadRequestError, ConflictError } from '../errors/app-error.js';
import {
  byIdFilter,
  byUserAndIdFilter,
  byUserFilter,
  createRepositoryMetadata,
  FIRST_DOCUMENT_VERSION,
  objectIdToString,
  parseObjectId,
  restoreUpdate,
  softDeleteUpdate,
  versionConflictError,
  versionedUpdate,
  withExpectedVersion,
  withSoftDeleteFilter,
  type RepositoryDocument,
  type UserOwnedRepositoryDocument,
} from './base.repository.js';

interface TestDocument extends UserOwnedRepositoryDocument {
  title: string;
}

const itemId = new ObjectId('507f1f77bcf86cd799439011');
const userId = new ObjectId('507f1f77bcf86cd799439012');
const now = new Date('2026-09-28T16:30:00.000Z');

describe('repository object id helpers', () => {
  it('parses 24-character hexadecimal ids', () => {
    expect(parseObjectId('507F1F77BCF86CD799439011')).toEqual(itemId);
    expect(objectIdToString(itemId)).toBe('507f1f77bcf86cd799439011');
  });

  it.each(['', '507f1f77bcf86cd79943901', '507f1f77bcf86cd799439011z'])(
    'rejects invalid id value %j',
    (value) => {
      expect(() => parseObjectId(value)).toThrow(BadRequestError);
    },
  );
});

describe('repository metadata helpers', () => {
  it('creates insert metadata for versioned soft-deletable documents', () => {
    const metadata = createRepositoryMetadata(now);

    expect(metadata).toEqual({
      createdAt: now,
      updatedAt: now,
      version: FIRST_DOCUMENT_VERSION,
      deletedAt: null,
    });
    expect(metadata.createdAt).not.toBe(now);
    expect(metadata.updatedAt).not.toBe(now);
  });

  it('builds versioned update documents', () => {
    const set: MatchKeysAndValues<TestDocument> = { title: 'Plan the week' };

    expect(versionedUpdate<TestDocument>(set, now)).toEqual({
      $set: { title: 'Plan the week', updatedAt: now },
      $inc: { version: 1 },
    });
  });

  it('builds soft-delete and restore updates', () => {
    expect(softDeleteUpdate<TestDocument>(now)).toEqual({
      $set: { deletedAt: now, updatedAt: now },
      $inc: { version: 1 },
    });
    expect(restoreUpdate<TestDocument>(now)).toEqual({
      $set: { deletedAt: null, updatedAt: now },
      $inc: { version: 1 },
    });
  });
});

describe('repository filter helpers', () => {
  it('filters active documents by default', () => {
    const filter: Filter<TestDocument> = { title: 'Draft' };

    expect(withSoftDeleteFilter(filter)).toEqual({
      $and: [{ title: 'Draft' }, { deletedAt: null }],
    });
  });

  it('can include all documents or only soft-deleted documents', () => {
    const filter: Filter<TestDocument> = { title: 'Draft' };

    expect(withSoftDeleteFilter(filter, 'all')).toEqual(filter);
    expect(withSoftDeleteFilter(filter, 'deleted')).toEqual({
      $and: [{ title: 'Draft' }, { deletedAt: { $exists: true, $ne: null } }],
    });
  });

  it('builds id and owner-scoped filters', () => {
    expect(byIdFilter<TestDocument>(itemId)).toEqual({
      $and: [{ _id: itemId }, { deletedAt: null }],
    });
    expect(byUserFilter<TestDocument>(userId)).toEqual({
      $and: [{ userId }, { deletedAt: null }],
    });
    expect(byUserAndIdFilter<TestDocument>(userId, itemId, 'all')).toEqual({
      $and: [{ _id: itemId }, { userId }],
    });
  });

  it('adds an expected document version to write filters', () => {
    const filter: Filter<TestDocument> = { _id: itemId };

    expect(withExpectedVersion(filter, 4)).toEqual({
      $and: [{ _id: itemId }, { version: 4 }],
    });
  });

  it('rejects invalid expected versions', () => {
    expect(() => withExpectedVersion<RepositoryDocument>({}, 0)).toThrow(BadRequestError);
  });
});

describe('versionConflictError', () => {
  it('names the resource and marks the version as stale', () => {
    const error = versionConflictError('Task');

    expect(error).toBeInstanceOf(ConflictError);
    expect(error.message).toBe('Task was changed by another request');
    expect(error.details).toEqual({ reason: 'stale_version' });
  });
});
