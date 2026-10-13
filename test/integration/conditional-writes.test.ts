import type { Express } from 'express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { etagOf, registerUser, type ApiSession } from '../helpers/api-session.js';
import { createTestConfig, silentLogger } from '../helpers/test-config.js';
import { createTestDatabase, type TestDatabase } from '../helpers/test-database.js';

interface Versioned {
  id: string;
  version: number;
}

describe('conditional writes', () => {
  let database: TestDatabase;
  let app: Express;
  let user: ApiSession;
  let calendar: Versioned;

  beforeAll(async () => {
    database = await createTestDatabase();
    app = createApp({ config: createTestConfig(), logger: silentLogger, db: database.db }).app;
    user = await registerUser(app, 'versions@example.com');
    calendar = (await user.post('/calendars').send({ name: 'Work' })).body as Versioned;
  });

  afterAll(async () => {
    await database.dispose();
  });

  async function createTask(title: string): Promise<Versioned> {
    const res = await user.post('/tasks').send({ title });
    return res.body as Versioned;
  }

  async function createEvent(title: string): Promise<Versioned> {
    const res = await user.post('/events').send({
      kind: 'timed',
      calendarId: calendar.id,
      title,
      startUtc: '2026-10-12T09:00:00.000Z',
      endUtc: '2026-10-12T10:00:00.000Z',
      timeZone: 'UTC',
    });
    return res.body as Versioned;
  }

  it('sends the version of a created resource as its ETag', async () => {
    const res = await user.post('/tasks').send({ title: 'Fresh' });

    expect(res.status).toBe(201);
    expect(res.headers.etag).toBe('"1"');
    expect(res.body).toMatchObject({ version: 1 });
  });

  it('applies a change based on the current version and returns the next ETag', async () => {
    const task = await createTask('Rename me');

    const res = await user
      .patch(`/tasks/${task.id}`)
      .set('If-Match', etagOf(task))
      .send({ title: 'Renamed' });

    expect(res.status).toBe(200);
    expect(res.headers.etag).toBe('"2"');
    expect(res.body).toMatchObject({ title: 'Renamed', version: 2 });
  });

  it('answers 428 when a change does not say which version it is based on', async () => {
    const task = await createTask('No precondition');

    const res = await user.patch(`/tasks/${task.id}`).send({ title: 'Blind write' });

    expect(res.status).toBe(428);
    expect(res.body).toMatchObject({ code: 'PRECONDITION_REQUIRED' });
  });

  it('answers 412 and keeps the newer state when the version is stale', async () => {
    const task = await createTask('Edited twice');
    await user.patch(`/tasks/${task.id}`).set('If-Match', etagOf(task)).send({ title: 'First' });

    const stale = await user
      .patch(`/tasks/${task.id}`)
      .set('If-Match', etagOf(task))
      .send({ title: 'Second' });
    const tasks = (await user.get('/tasks')).body as (Versioned & { title: string })[];

    expect(stale.status).toBe(412);
    expect(stale.body).toMatchObject({
      code: 'PRECONDITION_FAILED',
      details: { reason: 'stale_version' },
    });
    expect(tasks.find(({ id }) => id === task.id)).toMatchObject({ title: 'First', version: 2 });
  });

  it.each(['1', 'W/"1"', '*', '"1", "2"'])(
    'answers 400 for the If-Match value %j',
    async (value) => {
      const task = await createTask('Malformed precondition');

      const res = await user.patch(`/tasks/${task.id}`).set('If-Match', value).send({ title: 'x' });

      expect(res.status).toBe(400);
    },
  );

  it('refuses to delete a task that changed after it was read', async () => {
    const task = await createTask('Changed before delete');
    await user.patch(`/tasks/${task.id}`).set('If-Match', etagOf(task)).send({ status: 'done' });

    const stale = await user.delete(`/tasks/${task.id}`).set('If-Match', etagOf(task));
    const current = await user.delete(`/tasks/${task.id}`).set('If-Match', '"2"');

    expect(stale.status).toBe(412);
    expect(current.status).toBe(204);
  });

  it('refuses to reorder a task from a stale version', async () => {
    const first = await createTask('Order A');
    const second = await createTask('Order B');
    await user.patch(`/tasks/${second.id}`).set('If-Match', etagOf(second)).send({ title: 'B2' });

    const stale = await user
      .put(`/tasks/${second.id}/position`)
      .set('If-Match', etagOf(second))
      .send({ beforeId: first.id });
    const missing = await user.put(`/tasks/${second.id}/position`).send({ beforeId: first.id });

    expect(stale.status).toBe(412);
    expect(missing.status).toBe(428);
  });

  it('guards calendar updates and deletes', async () => {
    const created = (await user.post('/calendars').send({ name: 'Side project' }))
      .body as Versioned;

    const blind = await user.patch(`/calendars/${created.id}`).send({ visible: false });
    const updated = await user
      .patch(`/calendars/${created.id}`)
      .set('If-Match', etagOf(created))
      .send({ visible: false });
    const staleDelete = await user
      .delete(`/calendars/${created.id}`)
      .set('If-Match', etagOf(created));
    const deleted = await user
      .delete(`/calendars/${created.id}`)
      .set('If-Match', etagOf(updated.body as Versioned));

    expect(blind.status).toBe(428);
    expect(updated.status).toBe(200);
    expect(updated.headers.etag).toBe('"2"');
    expect(staleDelete.status).toBe(412);
    expect(deleted.status).toBe(204);
  });

  it('guards event updates and deletes', async () => {
    const event = await createEvent('Review');

    const moved = await user
      .patch(`/events/${event.id}`)
      .set('If-Match', etagOf(event))
      .send({ startUtc: '2026-10-12T11:00:00.000Z', endUtc: '2026-10-12T12:00:00.000Z' });
    const staleMove = await user
      .patch(`/events/${event.id}`)
      .set('If-Match', etagOf(event))
      .send({ title: 'Stale' });
    const blindDelete = await user.delete(`/events/${event.id}`);
    const deleted = await user.delete(`/events/${event.id}`).set('If-Match', '"2"');

    expect(moved.status).toBe(200);
    expect(staleMove.status).toBe(412);
    expect(blindDelete.status).toBe(428);
    expect(deleted.status).toBe(204);
  });

  it('answers 404, not 412, for a resource that does not exist', async () => {
    const res = await user
      .patch('/tasks/0123456789abcdef01234567')
      .set('If-Match', '"1"')
      .send({ title: 'Ghost' });

    expect(res.status).toBe(404);
  });

  it("answers 404 for another user's resource whatever version is sent", async () => {
    const task = await createTask('Private');
    const stranger = await registerUser(app, 'other-versions@example.com');

    const edit = await stranger
      .patch(`/tasks/${task.id}`)
      .set('If-Match', etagOf(task))
      .send({ title: 'Taken' });
    const remove = await stranger.delete(`/tasks/${task.id}`).set('If-Match', etagOf(task));

    expect(edit.status).toBe(404);
    expect(remove.status).toBe(404);
  });
});
