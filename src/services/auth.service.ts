import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import * as argon2 from 'argon2';
import { ForbiddenError, UnauthorizedError } from '../errors/app-error.js';
import type {
  CreateSessionInput,
  SessionDocument,
  SessionsRepository,
} from '../repositories/sessions.repository.js';
import { toUserView, type UserView } from '../mappers/user.mapper.js';
import type {
  UserDocument,
  UserSettings,
  UsersRepository,
} from '../repositories/users.repository.js';
import type { LoginRequest, RegisterRequest } from '../schemas/auth.schemas.js';

const SESSION_TOKEN_BYTES = 32;
const CSRF_TOKEN_BYTES = 32;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const PASSWORD_HASH_OPTIONS: argon2.HashOptions & { raw?: false } = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  raw: false,
};

export interface AuthSession {
  user: UserView;
  session: SessionDocument;
  sessionToken: string;
  csrfToken: string;
  expiresAt: Date;
}

export interface CurrentSession {
  user: UserView;
  session: SessionDocument;
  expiresAt: Date;
}

export interface AuthRepositories {
  users: UsersRepository;
  sessions: SessionsRepository;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function generateOpaqueToken(bytes: number): string {
  return randomBytes(bytes).toString('base64url');
}

function hashOpaqueToken(token: string): string {
  return createHash('sha256').update(token).digest('base64url');
}

function hashesMatch(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function defaultUserSettings(timeZone = 'UTC'): UserSettings {
  return {
    timeZone,
    weekStartsOn: 1,
    hourCycle: 'h23',
    locale: 'en',
    theme: 'system',
    accentColor: 'blue',
  };
}

export function hashSessionToken(sessionToken: string): string {
  return hashOpaqueToken(sessionToken);
}

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, PASSWORD_HASH_OPTIONS);
}

export class AuthService {
  constructor(private readonly repositories: AuthRepositories) {}

  async register(input: RegisterRequest, now = new Date()): Promise<AuthSession> {
    const user = await this.repositories.users.create(
      {
        email: normalizeEmail(input.email),
        passwordHash: await hashPassword(input.password),
        displayName: input.displayName.trim(),
        settings: defaultUserSettings(input.timeZone),
      },
      now,
    );

    return this.createSessionForUser(user, now);
  }

  async login(input: LoginRequest, now = new Date()): Promise<AuthSession> {
    const user = await this.repositories.users.findActiveByEmail(normalizeEmail(input.email), now);

    if (!user || !(await argon2.verify(user.passwordHash, input.password))) {
      throw new UnauthorizedError('Invalid email or password');
    }

    return this.createSessionForUser(user, now);
  }

  async getCurrentSession(
    sessionToken: string | undefined,
    now = new Date(),
  ): Promise<CurrentSession | null> {
    if (!sessionToken) {
      return null;
    }

    const session = await this.repositories.sessions.findActiveByTokenHash(
      hashSessionToken(sessionToken),
      now,
    );

    if (!session) {
      return null;
    }

    const user = await this.repositories.users.findActiveById(session.userId, now);
    if (!user) {
      return null;
    }

    return {
      user: toUserView(user),
      session,
      expiresAt: session.expiresAt,
    };
  }

  async logout(sessionToken: string | undefined): Promise<void> {
    if (!sessionToken) {
      return;
    }

    await this.repositories.sessions.deleteByTokenHash(hashSessionToken(sessionToken));
  }

  validateCsrf(
    session: SessionDocument,
    csrfCookie: string | undefined,
    csrfHeader: string | undefined,
  ): void {
    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      throw new ForbiddenError('CSRF token is missing or invalid');
    }

    if (!hashesMatch(hashOpaqueToken(csrfCookie), session.csrfTokenHash)) {
      throw new ForbiddenError('CSRF token is missing or invalid');
    }
  }

  async createSessionForUser(user: UserDocument, now = new Date()): Promise<AuthSession> {
    const sessionToken = generateOpaqueToken(SESSION_TOKEN_BYTES);
    const csrfToken = generateOpaqueToken(CSRF_TOKEN_BYTES);
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
    const sessionInput: CreateSessionInput = {
      tokenHash: hashSessionToken(sessionToken),
      csrfTokenHash: hashOpaqueToken(csrfToken),
      userId: user._id,
      expiresAt,
    };
    const session = await this.repositories.sessions.create(sessionInput, now);

    return {
      user: toUserView(user),
      session,
      sessionToken,
      csrfToken,
      expiresAt,
    };
  }
}
