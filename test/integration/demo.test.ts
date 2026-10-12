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

function startDemo(app: Express, body?: object): request.Test {
  return request(app).post('/api/v1/auth/demo').set('Origin', TEST_ORIGIN).send(body);
}

describe('POST /auth/demo', () => {
  let database: TestDatabase;
  let app: Express;

  beforeAll(async () => {
    database = await createTestDatabase();
    app = createApp({ config: createTestConfig(), logger: silentLogger, db: database.db }).app;
  });

  afterAll(async () => {
    await database.dispose();
  });

  it("starts the demo account in the visitor's time zone", async () => {
    const res = await startDemo(app, { timeZone: 'America/New_York' });

    expect(res.status).toBe(201);
    expect((res.body as SessionBody).user).toMatchObject({
      isDemo: true,
      settings: { timeZone: 'America/New_York' },
    });
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
