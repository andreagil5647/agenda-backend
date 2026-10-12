import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { TEST_ORIGIN } from '../helpers/api-session.js';
import { cookieHeader } from '../helpers/session-cookies.js';
import { createTestConfig, silentLogger } from '../helpers/test-config.js';
import { createTestDatabase, type TestDatabase } from '../helpers/test-database.js';

interface SessionBody {
  user: { isDemo: boolean; settings: { timeZone: string } };
}

interface EventBody {
  title: string;
  kind: string;
  taskId: string | null;
  startUtc: string | null;
  endUtc: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function wallClock(instant: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(instant));
}

function startDemo(app: Express, body?: object): request.Test {
  return request(app).post('/api/v1/auth/demo').set('Origin', TEST_ORIGIN).send(body);
}

describe('POST /auth/demo', () => {
  let database: TestDatabase;
  let app: Express;
  const extraDatabases: TestDatabase[] = [];

  beforeAll(async () => {
    database = await createTestDatabase();
    app = createApp({ config: createTestConfig(), logger: silentLogger, db: database.db }).app;
  });

  afterAll(async () => {
    await Promise.all([database, ...extraDatabases].map((each) => each.dispose()));
  });

  /** A database of its own, for apps whose limits must not see other tests' demo accounts. */
  async function isolatedDatabase(): Promise<TestDatabase> {
    const isolated = await createTestDatabase();
    extraDatabases.push(isolated);
    return isolated;
  }

  it("starts the demo account in the visitor's time zone", async () => {
    const res = await startDemo(app, { timeZone: 'America/New_York' });

    expect(res.status).toBe(201);
    expect((res.body as SessionBody).user).toMatchObject({
      isDemo: true,
      settings: { timeZone: 'America/New_York' },
    });
  });

  it('seeds a day laid out on the wall clock of that time zone', async () => {
    const demo = await startDemo(app, { timeZone: 'America/New_York' });
    const cookie = cookieHeader(demo);
    const from = new Date(Date.now() - 2 * DAY_MS).toISOString();
    const to = new Date(Date.now() + 3 * DAY_MS).toISOString();

    const [calendars, tasks, events] = await Promise.all([
      request(app).get('/api/v1/calendars').set('Cookie', cookie),
      request(app).get('/api/v1/tasks').set('Cookie', cookie),
      request(app).get(`/api/v1/events?from=${from}&to=${to}`).set('Cookie', cookie),
    ]);
    const blocks = events.body as EventBody[];
    const standUp = blocks.find((event) => event.title === 'Stand-up');
    const checklist = blocks.find((event) => event.title === 'Draft launch checklist');

    expect((calendars.body as { name: string }[]).map(({ name }) => name)).toEqual([
      'Work',
      'Personal',
      'Health',
    ]);
    expect((tasks.body as unknown[]).length).toBeGreaterThanOrEqual(5);
    expect(standUp?.startUtc && wallClock(standUp.startUtc, 'America/New_York')).toBe('09:00');
    expect(standUp?.endUtc && wallClock(standUp.endUtc, 'America/New_York')).toBe('09:30');
    expect(checklist?.taskId).toEqual(expect.any(String));
    expect(blocks.some((event) => event.kind === 'allDay')).toBe(true);
  });

  it('falls back to UTC when no time zone is sent', async () => {
    const withEmptyBody = await startDemo(app, {});
    const withoutBody = await startDemo(app);

    expect((withEmptyBody.body as SessionBody).user.settings.timeZone).toBe('UTC');
    expect((withoutBody.body as SessionBody).user.settings.timeZone).toBe('UTC');
  });

  it('rejects a time zone that does not exist', async () => {
    const res = await startDemo(app, { timeZone: 'Atlantis/Central' });

    expect(res.status).toBe(422);
  });

  it('refuses new demo accounts once the cap is reached, without touching existing ones', async () => {
    const capped = createApp({
      config: createTestConfig({ DEMO_MAX_ACTIVE_USERS: '1' }),
      logger: silentLogger,
      db: (await isolatedDatabase()).db,
    }).app;

    const first = await startDemo(capped);
    const second = await startDemo(capped);
    const firstStillWorks = await request(capped)
      .get('/api/v1/tasks')
      .set('Cookie', cookieHeader(first));

    expect(first.status).toBe(201);
    expect(second.status).toBe(429);
    expect(second.body).toMatchObject({ code: 'RATE_LIMITED' });
    expect(firstStillWorks.status).toBe(200);
  });

  it('limits demo sign-ins per address more tightly than other requests', async () => {
    const limited = createApp({
      config: createTestConfig({ DEMO_RATE_LIMIT_MAX: '2' }),
      logger: silentLogger,
      db: (await isolatedDatabase()).db,
    }).app;

    const statuses = [];
    for (let attempt = 0; attempt < 3; attempt += 1) {
      statuses.push((await startDemo(limited)).status);
    }
    const otherRoute = await request(limited).get('/api/v1/auth/session');

    expect(statuses).toEqual([201, 201, 429]);
    expect(otherRoute.status).toBe(200);
  });

  it('starts a registered account in the time zone sent at sign-up', async () => {
    const res = await request(app).post('/api/v1/auth/register').set('Origin', TEST_ORIGIN).send({
      email: 'zoned@example.com',
      password: 'correct horse battery staple',
      displayName: 'Zoned',
      timeZone: 'Asia/Tokyo',
    });
    const me = await request(app).get('/api/v1/me').set('Cookie', cookieHeader(res));

    expect(res.status).toBe(201);
    expect(me.body).toMatchObject({ settings: { timeZone: 'Asia/Tokyo' } });
  });
});
