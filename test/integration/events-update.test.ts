import type { Express } from 'express';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { registerUser, type ApiSession } from '../helpers/api-session.js';
import { createTestConfig, silentLogger } from '../helpers/test-config.js';
import { createTestDatabase, type TestDatabase } from '../helpers/test-database.js';

interface EventBody {
  id: string;
  startUtc: string | null;
  endUtc: string | null;
  startDate: string | null;
  version: number;
}

const UNKNOWN_ID = '0123456789abcdef01234567';

describe('PATCH /events/:id', () => {
  let database: TestDatabase;
  let app: Express;
  let owner: ApiSession;
  let calendarId: string;
  let timed: EventBody;
  let allDay: EventBody;

  beforeAll(async () => {
    database = await createTestDatabase();
    app = createApp({ config: createTestConfig(), logger: silentLogger, db: database.db }).app;
    owner = await registerUser(app, 'owner@example.com');
    const calendar = await owner.post('/calendars').send({ name: 'Work' });
    calendarId = (calendar.body as { id: string }).id;
  });

  beforeEach(async () => {
    const createdTimed = await owner.post('/events').send({
      kind: 'timed',
      calendarId,
      title: 'Focus',
      startUtc: '2026-10-12T09:00:00.000Z',
      endUtc: '2026-10-12T10:00:00.000Z',
      timeZone: 'Europe/Madrid',
    });
    const createdAllDay = await owner.post('/events').send({
      kind: 'allDay',
      calendarId,
      title: 'Day off',
      startDate: '2026-10-12',
      endDate: '2026-10-13',
    });
    timed = createdTimed.body as EventBody;
    allDay = createdAllDay.body as EventBody;
  });

  afterAll(async () => {
    await database.dispose();
  });

  it('moves a timed event and bumps its version', async () => {
    const res = await owner.patch(`/events/${timed.id}`).send({
      startUtc: '2026-10-12T14:00:00.000Z',
      endUtc: '2026-10-12T15:30:00.000Z',
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      startUtc: '2026-10-12T14:00:00.000Z',
      endUtc: '2026-10-12T15:30:00.000Z',
      version: timed.version + 1,
    });
  });

  it('rejects an end that is before the stored start', async () => {
    const res = await owner
      .patch(`/events/${timed.id}`)
      .send({ endUtc: '2026-10-12T08:00:00.000Z' });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      code: 'BAD_REQUEST',
      message: 'Event end must be after start',
    });
  });

  it('rejects a start that is after the stored end', async () => {
    const res = await owner
      .patch(`/events/${timed.id}`)
      .send({ startUtc: '2026-10-12T11:00:00.000Z' });

    expect(res.status).toBe(400);
  });

  it('leaves the event untouched after a rejected change', async () => {
    await owner.patch(`/events/${timed.id}`).send({ endUtc: '2026-10-12T08:00:00.000Z' });

    const list = await owner.get(
      '/events?from=2026-10-12T00:00:00.000Z&to=2026-10-13T00:00:00.000Z',
    );
    const stored = (list.body as EventBody[]).find((event) => event.id === timed.id);

    expect(stored).toMatchObject({ endUtc: '2026-10-12T10:00:00.000Z', version: timed.version });
  });

  it('rejects all-day dates on a timed event', async () => {
    const res = await owner.patch(`/events/${timed.id}`).send({ startDate: '2026-10-14' });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ details: { fields: ['startDate'] } });
  });

  it('rejects instants on an all-day event', async () => {
    const res = await owner
      .patch(`/events/${allDay.id}`)
      .send({ startUtc: '2026-10-12T09:00:00.000Z' });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ details: { fields: ['startUtc'] } });
  });

  it('rejects an all-day end date that is not after the start date', async () => {
    const res = await owner.patch(`/events/${allDay.id}`).send({ endDate: '2026-10-12' });

    expect(res.status).toBe(400);
  });

  it('renames an event without touching its schedule', async () => {
    const res = await owner.patch(`/events/${timed.id}`).send({ title: 'Deep work' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ title: 'Deep work', startUtc: timed.startUtc });
  });

  it('answers 404 for an event that does not exist', async () => {
    const res = await owner.patch(`/events/${UNKNOWN_ID}`).send({ title: 'Ghost' });

    expect(res.status).toBe(404);
  });

  it("answers 404 for another user's event, and for another user's calendar", async () => {
    const stranger = await registerUser(app, 'stranger@example.com');
    const strangerCalendar = await stranger.post('/calendars').send({ name: 'Theirs' });
    const strangerCalendarId = (strangerCalendar.body as { id: string }).id;

    const editTheirs = await stranger.patch(`/events/${timed.id}`).send({ title: 'Mine now' });
    const moveToTheirs = await owner
      .patch(`/events/${timed.id}`)
      .send({ calendarId: strangerCalendarId });

    expect(editTheirs.status).toBe(404);
    expect(moveToTheirs.status).toBe(404);
  });
});
