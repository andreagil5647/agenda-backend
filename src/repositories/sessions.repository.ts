import { ObjectId, type Collection, type Db } from 'mongodb';

export interface SessionDocument {
  _id: ObjectId;
  tokenHash: string;
  csrfTokenHash: string;
  userId: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

export interface CreateSessionInput {
  tokenHash: string;
  csrfTokenHash: string;
  userId: ObjectId;
  expiresAt: Date;
}

export class SessionsRepository {
  private readonly sessions: Collection<SessionDocument>;

  constructor(db: Db) {
    this.sessions = db.collection<SessionDocument>('sessions');
  }

  async create(input: CreateSessionInput, now = new Date()): Promise<SessionDocument> {
    const session: SessionDocument = {
      _id: new ObjectId(),
      tokenHash: input.tokenHash,
      csrfTokenHash: input.csrfTokenHash,
      userId: input.userId,
      createdAt: now,
      updatedAt: now,
      expiresAt: input.expiresAt,
    };

    await this.sessions.insertOne(session);
    return session;
  }

  async findActiveByTokenHash(
    tokenHash: string,
    now = new Date(),
  ): Promise<SessionDocument | null> {
    return this.sessions.findOne({ tokenHash, expiresAt: { $gt: now } });
  }

  async deleteByTokenHash(tokenHash: string): Promise<void> {
    await this.sessions.deleteOne({ tokenHash });
  }

  async deleteManyByUser(userId: ObjectId): Promise<void> {
    await this.sessions.deleteMany({ userId });
  }
}
