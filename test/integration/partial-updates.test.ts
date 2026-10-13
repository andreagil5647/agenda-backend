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

describe('partial updates', () => {
  let database: TestDatabase;
  let app: Express;
  let user: ApiSession;

  beforeAll(async () => {
    database = await createTestDatabase();
    app = createApp({ config: createTestConfig(), logger: silentLogger, db: database.db }).app;
    user = await registerUser(app, 'partial@example.com');
  });

  afterAll(async () => {
    await database.dispose();
  });

  it('changes only the task fields that were sent', async () => {
    const created = await user.post('/tasks').send({
      title: 'Draft launch checklist',
      dueDate: '2026-10-12',
      priority: 'high',
      estimateMinutes: 90,
    });

    const updated = await user
      .patch(`/tasks/${(created.body as Versioned).id}`)
      .set('If-Match', etagOf(created.body as Versioned))
      .send({ status: 'done' });

    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({
      title: 'Draft launch checklist',
      dueDate: '2026-10-12',
      priority: 'high',
      estimateMinutes: 90,
      status: 'done',
    });
  });

  it('changes only the calendar fields that were sent', async () => {
    const created = await user.post('/calendars').send({
      name: 'Health',
      colorKey: 'rose',
      visible: false,
      defaultReminderMinutes: [30],
    });

    const updated = await user
      .patch(`/calendars/${(created.body as Versioned).id}`)
      .set('If-Match', etagOf(created.body as Versioned))
      .send({ name: 'Wellbeing' });

    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({
      name: 'Wellbeing',
      colorKey: 'rose',
      visible: false,
      defaultReminderMinutes: [30],
    });
  });

  it('leaves a resource as it was for an empty patch, apart from its version', async () => {
    const created = await user.post('/tasks').send({ title: 'Untouched', estimateMinutes: 45 });

    const updated = await user
      .patch(`/tasks/${(created.body as Versioned).id}`)
      .set('If-Match', etagOf(created.body as Versioned))
      .send({});

    expect(updated.body).toMatchObject({ title: 'Untouched', estimateMinutes: 45, version: 2 });
  });
});
