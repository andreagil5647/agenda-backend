import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  SESSION_COOKIE_NAME,
} from '../../src/controllers/auth.controller.js';
import { hashSessionToken } from '../../src/services/auth.service.js';
import { createTestConfig, silentLogger } from '../helpers/test-config.js';
import { createTestDatabase, type TestDatabase } from '../helpers/test-database.js';

const origin = 'http://localhost:3000';

interface AuthResponseBody {
  user: { email: string; displayName: string };
  csrfToken: string;
}

function getSetCookies(res: request.Response): string[] {
  const header = res.headers['set-cookie'];
  if (Array.isArray(header)) {
    return header;
  }
  return typeof header === 'string' ? [header] : [];
}

function cookiePair(setCookie: string, name: string): string {
  const pair = setCookie.split(';')[0];
  if (!pair?.startsWith(`${name}=`)) {
    throw new Error(`Cookie ${name} not found`);
  }
  return pair;
}

function findSetCookie(res: request.Response, name: string): string {
  const cookie = getSetCookies(res).find((value) => value.startsWith(`${name}=`));
  if (!cookie) {
    throw new Error(`Set-Cookie ${name} not found`);
  }
  return cookie;
}

function cookieValue(setCookie: string, name: string): string {
  return decodeURIComponent(cookiePair(setCookie, name).slice(name.length + 1));
}

function cookieHeader(res: request.Response): string {
  return [
    cookiePair(findSetCookie(res, SESSION_COOKIE_NAME), SESSION_COOKIE_NAME),
    cookiePair(findSetCookie(res, CSRF_COOKIE_NAME), CSRF_COOKIE_NAME),
  ].join('; ');
}

async function register(app: ReturnType<typeof createApp>['app'], email: string) {
  return request(app).post('/api/v1/auth/register').set('Origin', origin).send({
    email,
    password: 'correct horse battery staple',
    displayName: 'Andrea',
  });
}

describe('auth endpoints', () => {
  let database: TestDatabase;
  let app: ReturnType<typeof createApp>['app'];

  beforeAll(async () => {
    database = await createTestDatabase();
    app = createApp({ config: createTestConfig(), logger: silentLogger, db: database.db }).app;
  });

  afterAll(async () => {
    await database.dispose();
  });

  it('creates auth indexes at database startup', async () => {
    const [userIndexes, sessionIndexes] = await Promise.all([
      database.db.collection('users').indexes(),
      database.db.collection('sessions').indexes(),
    ]);

    expect(userIndexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'users_email_unique', unique: true }),
        expect.objectContaining({ name: 'users_expires_at_ttl', expireAfterSeconds: 0 }),
      ]),
    );
    expect(sessionIndexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'sessions_token_hash_unique', unique: true }),
        expect.objectContaining({ name: 'sessions_user_id' }),
        expect.objectContaining({ name: 'sessions_expires_at_ttl', expireAfterSeconds: 0 }),
      ]),
    );
  });

  it('registers a user, hashes the password, and sets first-party auth cookies', async () => {
    const res = await register(app, 'new@example.com');

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      user: {
        id: expect.any(String) as string,
        email: 'new@example.com',
        displayName: 'Andrea',
        settings: {
          timeZone: 'UTC',
          weekStartsOn: 1,
          hourCycle: 'h23',
          locale: 'en',
          theme: 'system',
          accentColor: 'blue',
        },
        isDemo: false,
      },
      expiresAt: expect.any(String) as string,
      csrfToken: expect.any(String) as string,
    });
    const body = res.body as AuthResponseBody;
    expect(body.user).not.toHaveProperty('passwordHash');

    const sessionCookie = findSetCookie(res, SESSION_COOKIE_NAME);
    expect(sessionCookie).toContain('HttpOnly');
    expect(sessionCookie).toContain('Secure');
    expect(sessionCookie).toContain('SameSite=Lax');

    const csrfCookie = findSetCookie(res, CSRF_COOKIE_NAME);
    expect(csrfCookie).toContain('Secure');
    expect(csrfCookie).toContain('SameSite=Lax');
    expect(csrfCookie).not.toContain('HttpOnly');
    expect(cookieValue(csrfCookie, CSRF_COOKIE_NAME)).toBe(body.csrfToken);

    const user = await database.db.collection('users').findOne({ email: 'new@example.com' });
    expect(user?.passwordHash).toMatch(/^\$argon2id\$/);
    expect(user?.passwordHash).not.toBe('correct horse battery staple');
  });

  it('rejects duplicate email registration', async () => {
    await register(app, 'duplicate@example.com');

    const res = await register(app, 'duplicate@example.com');

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ code: 'CONFLICT', details: { field: 'email' } });
  });

  it('logs in and returns the current session from cookies', async () => {
    await register(app, 'login@example.com');

    const login = await request(app).post('/api/v1/auth/login').set('Origin', origin).send({
      email: 'login@example.com',
      password: 'correct horse battery staple',
    });

    expect(login.status).toBe(200);
    const loginBody = login.body as AuthResponseBody;

    const session = await request(app)
      .get('/api/v1/auth/session')
      .set('Cookie', cookieHeader(login));

    expect(session.status).toBe(200);
    expect(session.body).toMatchObject({
      user: { email: 'login@example.com', displayName: 'Andrea' },
      csrfToken: loginBody.csrfToken,
    });
  });

  it('rejects invalid login credentials without creating a session', async () => {
    await register(app, 'wrong-password@example.com');

    const res = await request(app).post('/api/v1/auth/login').set('Origin', origin).send({
      email: 'wrong-password@example.com',
      password: 'not the right password',
    });

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ code: 'UNAUTHORIZED' });
    expect(getSetCookies(res)).toEqual([]);
  });

  it('requires a matching CSRF token before logging out an active session', async () => {
    const created = await register(app, 'csrf@example.com');
    const cookies = cookieHeader(created);

    const rejected = await request(app).post('/api/v1/auth/logout').set('Cookie', cookies);

    expect(rejected.status).toBe(403);
    expect(rejected.body).toMatchObject({ code: 'FORBIDDEN' });

    const csrfToken = cookieValue(findSetCookie(created, CSRF_COOKIE_NAME), CSRF_COOKIE_NAME);
    const loggedOut = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', cookies)
      .set(CSRF_HEADER_NAME, csrfToken);

    expect(loggedOut.status).toBe(204);
    expect(findSetCookie(loggedOut, SESSION_COOKIE_NAME)).toContain('Expires=Thu, 01 Jan 1970');
    expect(findSetCookie(loggedOut, CSRF_COOKIE_NAME)).toContain('Expires=Thu, 01 Jan 1970');

    const session = await request(app).get('/api/v1/auth/session').set('Cookie', cookies);
    expect(session.body).toEqual({ user: null });
  });

  it('treats expired sessions as anonymous and clears stale cookies', async () => {
    const created = await register(app, 'expired@example.com');
    const sessionToken = cookieValue(
      findSetCookie(created, SESSION_COOKIE_NAME),
      SESSION_COOKIE_NAME,
    );

    await database.db
      .collection('sessions')
      .updateOne(
        { tokenHash: hashSessionToken(sessionToken) },
        { $set: { expiresAt: new Date(Date.now() - 1_000) } },
      );

    const res = await request(app).get('/api/v1/auth/session').set('Cookie', cookieHeader(created));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user: null });
    expect(findSetCookie(res, SESSION_COOKIE_NAME)).toContain('Expires=Thu, 01 Jan 1970');
  });

  it('rejects cross-site unsafe requests before they reach auth handlers', async () => {
    const badOrigin = await request(app)
      .post('/api/v1/auth/register')
      .set('Origin', 'https://evil.example')
      .send({
        email: 'bad-origin@example.com',
        password: 'correct horse battery staple',
        displayName: 'Andrea',
      });

    expect(badOrigin.status).toBe(403);

    const badFetchSite = await request(app)
      .post('/api/v1/auth/register')
      .set('Origin', origin)
      .set('Sec-Fetch-Site', 'cross-site')
      .send({
        email: 'bad-fetch-site@example.com',
        password: 'correct horse battery staple',
        displayName: 'Andrea',
      });

    expect(badFetchSite.status).toBe(403);
  });

  it('documents auth routes in the OpenAPI document', async () => {
    const res = await request(app).get('/api/openapi.json');
    const paths = res.body as { paths: Record<string, Record<string, { operationId: string }>> };

    expect(paths.paths['/api/v1/auth/register']?.post?.operationId).toBe('register');
    expect(paths.paths['/api/v1/auth/login']?.post?.operationId).toBe('login');
    expect(paths.paths['/api/v1/auth/logout']?.post?.operationId).toBe('logout');
    expect(paths.paths['/api/v1/auth/session']?.get?.operationId).toBe('getSession');
  });
});
