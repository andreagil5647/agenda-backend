import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { createTestConfig, silentLogger } from '../helpers/test-config.js';
import { cookieHeader } from '../helpers/session-cookies.js';
import { createTestDatabase, type TestDatabase } from '../helpers/test-database.js';

const origin = 'http://localhost:3000';

interface TaskBody {
  id: string;
  title: string;
}

describe('task ordering', () => {
  let database: TestDatabase;
  let app: ReturnType<typeof createApp>['app'];
  let cookie: string;
  let csrfToken: string;

  beforeAll(async () => {
    database = await createTestDatabase();
    app = createApp({ config: createTestConfig(), logger: silentLogger, db: database.db }).app;

    const session = await request(app).post('/api/v1/auth/demo').set('Origin', origin).send();
    cookie = cookieHeader(session);
    csrfToken = (session.body as { csrfToken: string }).csrfToken;
  });

  afterAll(async () => {
    await database.dispose();
  });

  async function createTask(title: string): Promise<TaskBody> {
    const res = await request(app)
      .post('/api/v1/tasks')
      .set('Origin', origin)
      .set('Cookie', cookie)
      .set('X-CSRF-Token', csrfToken)
      .send({ title });
    expect(res.status).toBe(201);
    return res.body as TaskBody;
  }

  async function listTitles(): Promise<string[]> {
    const res = await request(app).get('/api/v1/tasks').set('Cookie', cookie);
    return (res.body as TaskBody[]).map((task) => task.title);
  }

  it('lists tasks in creation order past the tenth task', async () => {
    const created = ['Review calendar layout', 'Draft launch checklist']; // seeded by the demo account
    for (let i = 1; i <= 12; i++) {
      const task = await createTask(`Task ${String(i)}`);
      created.push(task.title);
    }

    const titles = await listTitles();

    expect(titles.filter((title) => title.startsWith('Task '))).toEqual(
      created.filter((title) => title.startsWith('Task ')),
    );
    expect(titles.slice(-12)).toEqual(created.slice(-12));
  });

  it('moves a task between two neighbours', async () => {
    const first = await createTask('Move A');
    const second = await createTask('Move B');
    const third = await createTask('Move C');

    const moved = await request(app)
      .put(`/api/v1/tasks/${third.id}/position`)
      .set('Origin', origin)
      .set('Cookie', cookie)
      .set('X-CSRF-Token', csrfToken)
      .send({ afterId: first.id, beforeId: second.id });
    expect(moved.status).toBe(200);

    const titles = (await listTitles()).filter((title) => title.startsWith('Move '));
    expect(titles).toEqual(['Move A', 'Move C', 'Move B']);
  });

  it('moves a task to the top of the list', async () => {
    const task = await createTask('Move to top');

    const moved = await request(app)
      .put(`/api/v1/tasks/${task.id}/position`)
      .set('Origin', origin)
      .set('Cookie', cookie)
      .set('X-CSRF-Token', csrfToken)
      .send({ beforeId: await firstTaskId() });
    expect(moved.status).toBe(200);

    expect((await listTitles())[0]).toBe('Move to top');
  });

  async function firstTaskId(): Promise<string> {
    const res = await request(app).get('/api/v1/tasks').set('Cookie', cookie);
    const [first] = res.body as TaskBody[];
    if (!first) throw new Error('Expected at least one task');
    return first.id;
  }
});
