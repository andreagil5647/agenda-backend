import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { CSRF_COOKIE_NAME, SESSION_COOKIE_NAME } from '../../src/controllers/auth.controller.js';
import { createTestConfig, silentLogger } from '../helpers/test-config.js';
import { createTestDatabase, type TestDatabase } from '../helpers/test-database.js';

const origin = 'http://localhost:3000';

interface SessionBody {
  csrfToken: string;
  user: { displayName: string; isDemo: boolean };
}

interface CalendarBody {
  id: string;
  name: string;
  colorKey: string;
  visible: boolean;
}

interface TaskBody {
  id: string;
  title: string;
  status: string;
}

interface EventBody {
  id: string;
}

interface SettingsBody {
  settings: { timeZone: string; theme: string };
}

function getSetCookies(res: request.Response): string[] {
  const header = res.headers['set-cookie'];
  if (Array.isArray(header)) return header;
  return typeof header === 'string' ? [header] : [];
}

function findSetCookie(res: request.Response, name: string): string {
  const cookie = getSetCookies(res).find((value) => value.startsWith(`${name}=`));
  if (!cookie) throw new Error(`Set-Cookie ${name} not found`);
  return cookie;
}

function cookiePair(setCookie: string, name: string): string {
  const pair = setCookie.split(';')[0];
  if (!pair?.startsWith(`${name}=`)) throw new Error(`Cookie ${name} not found`);
  return pair;
}

function cookieHeader(res: request.Response): string {
  return [
    cookiePair(findSetCookie(res, SESSION_COOKIE_NAME), SESSION_COOKIE_NAME),
    cookiePair(findSetCookie(res, CSRF_COOKIE_NAME), CSRF_COOKIE_NAME),
  ].join('; ');
}

async function register(app: ReturnType<typeof createApp>['app']) {
  const res = await request(app).post('/api/v1/auth/register').set('Origin', origin).send({
    email: 'planner@example.com',
    password: 'correct horse battery staple',
    displayName: 'Planner User',
  });

  const body = res.body as SessionBody;

  return { res, cookie: cookieHeader(res), csrfToken: body.csrfToken };
}

describe('planner API', () => {
  let database: TestDatabase;
  let app: ReturnType<typeof createApp>['app'];

  beforeAll(async () => {
    database = await createTestDatabase();
    app = createApp({ config: createTestConfig(), logger: silentLogger, db: database.db }).app;
  });

  afterAll(async () => {
    await database.dispose();
  });

  it('requires authentication for planner resources', async () => {
    const res = await request(app).get('/api/v1/me');

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('supports settings, calendars, tasks and one-off events for a signed-in user', async () => {
    const auth = await register(app);

    const me = await request(app).get('/api/v1/me').set('Cookie', auth.cookie);
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ email: 'planner@example.com', displayName: 'Planner User' });

    const settings = await request(app)
      .patch('/api/v1/me/settings')
      .set('Origin', origin)
      .set('Cookie', auth.cookie)
      .set('X-CSRF-Token', auth.csrfToken)
      .send({ timeZone: 'Europe/Madrid', theme: 'dark' });
    expect(settings.status).toBe(200);
    const settingsBody = settings.body as SettingsBody;
    expect(settingsBody.settings).toMatchObject({ timeZone: 'Europe/Madrid', theme: 'dark' });

    const rejected = await request(app)
      .post('/api/v1/calendars')
      .set('Origin', origin)
      .set('Cookie', auth.cookie)
      .send({ name: 'No CSRF' });
    expect(rejected.status).toBe(403);

    const calendar = await request(app)
      .post('/api/v1/calendars')
      .set('Origin', origin)
      .set('Cookie', auth.cookie)
      .set('X-CSRF-Token', auth.csrfToken)
      .send({ name: 'Work', colorKey: 'blue', defaultReminderMinutes: [10] });
    expect(calendar.status).toBe(201);
    const calendarBody = calendar.body as CalendarBody;
    expect(calendarBody).toMatchObject({ name: 'Work', colorKey: 'blue', visible: true });

    const task = await request(app)
      .post('/api/v1/tasks')
      .set('Origin', origin)
      .set('Cookie', auth.cookie)
      .set('X-CSRF-Token', auth.csrfToken)
      .send({ title: 'Write integration test', dueDate: '2026-10-07', priority: 'high' });
    expect(task.status).toBe(201);
    const taskBody = task.body as TaskBody;
    expect(taskBody).toMatchObject({ title: 'Write integration test', status: 'todo' });

    const updatedTask = await request(app)
      .patch(`/api/v1/tasks/${taskBody.id}`)
      .set('Origin', origin)
      .set('Cookie', auth.cookie)
      .set('X-CSRF-Token', auth.csrfToken)
      .send({ status: 'done' });
    expect(updatedTask.status).toBe(200);
    const updatedTaskBody = updatedTask.body as TaskBody;
    expect(updatedTaskBody.status).toBe('done');

    const event = await request(app)
      .post('/api/v1/events')
      .set('Origin', origin)
      .set('Cookie', auth.cookie)
      .set('X-CSRF-Token', auth.csrfToken)
      .send({
        kind: 'timed',
        calendarId: calendarBody.id,
        taskId: taskBody.id,
        title: 'Time block',
        startUtc: '2026-10-07T09:00:00.000Z',
        endUtc: '2026-10-07T10:00:00.000Z',
        timeZone: 'Europe/Madrid',
      });
    expect(event.status).toBe(201);
    const eventBody = event.body as EventBody;
    expect(event.body).toMatchObject({ title: 'Time block', kind: 'timed' });

    const events = await request(app)
      .get('/api/v1/events?from=2026-10-07T00:00:00.000Z&to=2026-10-08T00:00:00.000Z')
      .set('Cookie', auth.cookie);
    expect(events.status).toBe(200);
    expect(events.body).toEqual([expect.objectContaining({ id: eventBody.id })]);

    const deletedTask = await request(app)
      .delete(`/api/v1/tasks/${taskBody.id}`)
      .set('Origin', origin)
      .set('Cookie', auth.cookie)
      .set('X-CSRF-Token', auth.csrfToken);
    expect(deletedTask.status).toBe(204);

    const restoredTask = await request(app)
      .post(`/api/v1/tasks/${taskBody.id}/restore`)
      .set('Origin', origin)
      .set('Cookie', auth.cookie)
      .set('X-CSRF-Token', auth.csrfToken);
    expect(restoredTask.status).toBe(201);
    const restoredTaskBody = restoredTask.body as TaskBody;
    expect(restoredTaskBody.title).toBe('Write integration test');
  });

  it('creates a seeded demo account', async () => {
    const demo = await request(app).post('/api/v1/auth/demo').set('Origin', origin).send();
    const cookie = cookieHeader(demo);
    const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const to = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    expect(demo.status).toBe(201);
    const demoBody = demo.body as SessionBody;
    expect(demoBody.user).toMatchObject({ displayName: 'Demo User', isDemo: true });

    const [calendars, tasks, events] = await Promise.all([
      request(app).get('/api/v1/calendars').set('Cookie', cookie),
      request(app).get('/api/v1/tasks').set('Cookie', cookie),
      request(app).get(`/api/v1/events?from=${from}&to=${to}`).set('Cookie', cookie),
    ]);

    expect((calendars.body as unknown[]).length).toBeGreaterThanOrEqual(2);
    expect((tasks.body as unknown[]).length).toBeGreaterThanOrEqual(2);
    expect((events.body as unknown[]).length).toBeGreaterThanOrEqual(1);
  });
});
