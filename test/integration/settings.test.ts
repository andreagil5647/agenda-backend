import type { Express } from 'express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { registerUser, type ApiSession } from '../helpers/api-session.js';
import { createTestConfig, silentLogger } from '../helpers/test-config.js';
import { createTestDatabase, type TestDatabase } from '../helpers/test-database.js';

interface MeBody {
  settings: { locale: string };
}

describe('PATCH /me/settings', () => {
  let database: TestDatabase;
  let app: Express;
  let owner: ApiSession;

  beforeAll(async () => {
    database = await createTestDatabase();
    app = createApp({ config: createTestConfig(), logger: silentLogger, db: database.db }).app;
    owner = await registerUser(app, 'owner@example.com');
  });

  afterAll(async () => {
    await database.dispose();
  });

  it('changes the language of the account, and keeps it', async () => {
    const changed = await owner.patch('/me/settings').send({ locale: 'es' });
    const me = await owner.get('/me');

    expect(changed.status).toBe(200);
    expect((changed.body as MeBody).settings.locale).toBe('es');
    expect((me.body as MeBody).settings.locale).toBe('es');
  });

  it('rejects a language the product is not written in, and leaves the account as it was', async () => {
    const rejected = await owner.patch('/me/settings').send({ locale: 'fr' });
    const me = await owner.get('/me');

    expect(rejected.status).toBe(422);
    expect(rejected.body).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect((me.body as MeBody).settings.locale).toBe('es');
  });
});
