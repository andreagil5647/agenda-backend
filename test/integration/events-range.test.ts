import type { Express } from 'express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { registerUser, type ApiSession } from '../helpers/api-session.js';
import { createTestConfig, silentLogger } from '../helpers/test-config.js';
import { createTestDatabase, type TestDatabase } from '../helpers/test-database.js';

async function titlesInRange(session: ApiSession, from: string, to: string): Promise<string[]> {
  const res = await session.get(`/events?from=${from}&to=${to}`);
  expect(res.status).toBe(200);
  return (res.body as { title: string }[]).map((event) => event.title);
}

describe('GET /events range', () => {
  let database: TestDatabase;
  let app: Express;
  let madrid: ApiSession;

  beforeAll(async () => {
    database = await createTestDatabase();
    app = createApp({ config: createTestConfig(), logger: silentLogger, db: database.db }).app;

    madrid = await registerUser(app, 'madrid@example.com');
    await madrid.patch('/me/settings').send({ timeZone: 'Europe/Madrid' });
    const calendar = await madrid.post('/calendars').send({ name: 'Personal' });
    const { id: calendarId } = calendar.body as { id: string };

    await madrid.post('/events').send({
      kind: 'allDay',
      calendarId,
      title: 'Day off',
      startDate: '2026-10-12',
      endDate: '2026-10-13',
    });
    await madrid.post('/events').send({
      kind: 'timed',
      calendarId,
      title: 'Late call',
      startUtc: '2026-10-12T21:00:00.000Z',
      endUtc: '2026-10-12T21:30:00.000Z',
      timeZone: 'Europe/Madrid',
    });
  });

  afterAll(async () => {
    await database.dispose();
  });

  // Madrid is UTC+2 on these dates, so its local day starts at 22:00Z the day before.
  it("returns an all-day event for its own local day in the user's time zone", async () => {
    const titles = await titlesInRange(
      madrid,
      '2026-10-11T22:00:00.000Z',
      '2026-10-12T22:00:00.000Z',
    );

    expect(titles).toEqual(expect.arrayContaining(['Day off', 'Late call']));
  });

  it('leaves the all-day event out of the day before', async () => {
    const titles = await titlesInRange(
      madrid,
      '2026-10-10T22:00:00.000Z',
      '2026-10-11T22:00:00.000Z',
    );

    expect(titles).toEqual([]);
  });

  it('leaves the all-day event out of the day after, where its exclusive end falls', async () => {
    const titles = await titlesInRange(
      madrid,
      '2026-10-12T22:00:00.000Z',
      '2026-10-13T22:00:00.000Z',
    );

    expect(titles).toEqual([]);
  });

  it('rejects a time zone that does not exist, in settings and on an event', async () => {
    const settings = await madrid.patch('/me/settings').send({ timeZone: 'Mars/Olympus_Mons' });
    const calendars = await madrid.get('/calendars');
    const [calendar] = calendars.body as { id: string }[];
    const event = await madrid.post('/events').send({
      kind: 'timed',
      calendarId: calendar?.id,
      title: 'Nowhere',
      startUtc: '2026-10-12T09:00:00.000Z',
      endUtc: '2026-10-12T10:00:00.000Z',
      timeZone: 'Not/AZone',
    });

    expect(settings.status).toBe(422);
    expect(event.status).toBe(422);
    expect(event.body).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('rejects a range that ends before it starts', async () => {
    const res = await madrid.get(
      '/events?from=2026-10-12T22:00:00.000Z&to=2026-10-11T22:00:00.000Z',
    );

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ code: 'BAD_REQUEST' });
  });
});
