import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { createTestConfig, createUnreachableDb, silentLogger } from '../helpers/test-config.js';
import { createTestDatabase, type TestDatabase } from '../helpers/test-database.js';

describe('health endpoints', () => {
  let database: TestDatabase;

  beforeAll(async () => {
    database = await createTestDatabase();
  });

  afterAll(async () => {
    await database.dispose();
  });

  function buildApp(env: NodeJS.ProcessEnv = {}) {
    return createApp({ config: createTestConfig(env), logger: silentLogger, db: database.db }).app;
  }

  it('reports liveness without touching the database', async () => {
    const app = createApp({
      config: createTestConfig({ RENDER_GIT_COMMIT: 'abcdef1234567' }),
      logger: silentLogger,
      db: createUnreachableDb(),
    }).app;

    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: 'ok',
      version: 'abcdef1',
      uptimeSeconds: expect.any(Number) as number,
    });
  });

  it('reports ready when the database answers', async () => {
    const res = await request(buildApp()).get('/api/v1/health/ready');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', checks: { database: 'up' } });
  });

  it('reports unavailable with a 503 when the database does not answer', async () => {
    const app = createApp({
      config: createTestConfig(),
      logger: silentLogger,
      db: createUnreachableDb(),
    }).app;

    const res = await request(app).get('/api/v1/health/ready');

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: 'unavailable', checks: { database: 'down' } });
  });

  it('does not rate limit health checks', async () => {
    const app = buildApp({ RATE_LIMIT_MAX: '1' });

    const statuses = [];
    for (let i = 0; i < 3; i++) {
      statuses.push((await request(app).get('/api/v1/health')).status);
    }

    expect(statuses).toEqual([200, 200, 200]);
  });

  it('documents both probes in the OpenAPI document', async () => {
    const res = await request(buildApp()).get('/api/openapi.json');

    const paths = res.body as { paths: Record<string, { get: { operationId: string } }> };
    expect(paths.paths['/api/v1/health']?.get.operationId).toBe('getLiveness');
    expect(paths.paths['/api/v1/health/ready']?.get.operationId).toBe('getReadiness');
  });
});
