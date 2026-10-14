import type { Express } from 'express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { registerUser, type ApiSession } from '../helpers/api-session.js';
import { createTestConfig, silentLogger } from '../helpers/test-config.js';
import { createTestDatabase, type TestDatabase } from '../helpers/test-database.js';

describe('POST /events', () => {
  let database: TestDatabase;
  let app: Express;
  let owner: ApiSession;
  let calendarId: string;

  beforeAll(async () => {
    database = await createTestDatabase();
    app = createApp({ config: createTestConfig(), logger: silentLogger, db: database.db }).app;
    owner = await registerUser(app, 'owner@example.com');
    const calendar = await owner.post('/calendars').send({ name: 'Work' });
    calendarId = (calendar.body as { id: string }).id;
  });

  afterAll(async () => {
    await database.dispose();
  });

  it.each([
    ['equal to', '2026-10-12T09:00:00.000Z'],
    ['before', '2026-10-12T08:00:00.000Z'],
  ])('rejects a timed event that ends %s its start, saying why', async (_relation, endUtc) => {
    const res = await owner.post('/events').send({
      kind: 'timed',
      calendarId,
      title: 'Focus',
      startUtc: '2026-10-12T09:00:00.000Z',
      endUtc,
      timeZone: 'Europe/Madrid',
    });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      code: 'BAD_REQUEST',
      details: { reason: 'end_not_after_start' },
    });
  });

  it('rejects an all-day event that ends on or before the day it starts, saying why', async () => {
    const res = await owner.post('/events').send({
      kind: 'allDay',
      calendarId,
      title: 'Day off',
      startDate: '2026-10-12',
      endDate: '2026-10-12',
    });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ details: { reason: 'end_not_after_start' } });
  });
});
