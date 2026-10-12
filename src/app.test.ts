import request from 'supertest';
import { describe, expect, it } from 'vitest';
import {
  createTestConfig,
  createUnreachableDb,
  silentLogger,
} from '../test/helpers/test-config.js';
import { createApp } from './app.js';

function buildApp(env: NodeJS.ProcessEnv = {}) {
  return createApp({
    config: createTestConfig(env),
    logger: silentLogger,
    db: createUnreachableDb(),
  }).app;
}

describe('createApp', () => {
  const app = buildApp();

  it('sets security headers and hides the framework', async () => {
    const res = await request(app).get('/api/v1/unknown');

    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['strict-transport-security']).toContain('max-age=');
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
  });

  it('marks API responses as not cacheable', async () => {
    const res = await request(app).get('/api/v1/unknown');

    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('generates a request id and returns it in the header and error body', async () => {
    const res = await request(app).get('/api/v1/unknown');

    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.body).toMatchObject({ code: 'NOT_FOUND', requestId: res.headers['x-request-id'] });
  });

  it('reuses a well-formed incoming request id', async () => {
    const res = await request(app).get('/api/v1/unknown').set('X-Request-Id', 'web-1234abcd');

    expect(res.headers['x-request-id']).toBe('web-1234abcd');
  });

  it('ignores a malformed incoming request id', async () => {
    const malformed = '<script>alert(1)</script>';
    const res = await request(app).get('/api/v1/unknown').set('X-Request-Id', malformed);

    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('allows credentialed CORS requests only from configured origins', async () => {
    const allowed = await request(app)
      .get('/api/v1/unknown')
      .set('Origin', 'http://localhost:3000');
    const denied = await request(app).get('/api/v1/unknown').set('Origin', 'https://evil.example');

    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(allowed.headers['access-control-allow-credentials']).toBe('true');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('rate limits API requests per client', async () => {
    const limited = buildApp({ RATE_LIMIT_MAX: '2' });

    await request(limited).get('/api/v1/unknown');
    await request(limited).get('/api/v1/unknown');
    const res = await request(limited).get('/api/v1/unknown');

    expect(res.status).toBe(429);
    expect(res.body).toMatchObject({ code: 'RATE_LIMITED' });
    expect(res.headers.ratelimit).toBeDefined();
  });

  it('serves the OpenAPI document', async () => {
    const res = await request(app).get('/api/openapi.json');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ openapi: '3.1.0', info: { title: 'Agenda API' } });
  });

  it('serves Swagger UI', async () => {
    const res = await request(app).get('/api/docs/');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('swagger-ui');
  });
});
