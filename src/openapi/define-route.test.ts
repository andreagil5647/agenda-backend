import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import express from 'express';
import { pino } from 'pino';
import { pinoHttp } from 'pino-http';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { errorHandler } from '../middleware/error-handler.js';
import { createRouteBuilder, toOpenApiPath } from './define-route.js';
import { buildOpenApiDocument } from './document.js';

function createTestApp() {
  const registry = new OpenAPIRegistry();
  const { router, route } = createRouteBuilder(registry, '/api/v1/items');

  route({
    method: 'post',
    path: '/:id',
    operationId: 'updateItem',
    summary: 'Update an item',
    tags: ['Items'],
    request: {
      params: z.object({ id: z.string().regex(/^\d+$/) }),
      query: z.object({ dryRun: z.stringbool().default(false) }),
      body: z.object({ title: z.string().min(1) }),
    },
    responses: { 200: { description: 'Updated', schema: z.object({ echo: z.unknown() }) } },
    handler: ({ params, query, body }, _req, res) => {
      res.json({ echo: { id: params.id, dryRun: query.dryRun, title: body.title } });
    },
  });

  route({
    method: 'get',
    path: '/',
    operationId: 'listItems',
    summary: 'List items',
    tags: ['Items'],
    responses: { 204: { description: 'Nothing to list' } },
    handler: (_input, _req, res) => {
      res.status(204).end();
    },
  });

  const app = express();
  app.use(pinoHttp({ logger: pino({ level: 'silent' }) }));
  app.use(express.json());
  app.use('/api/v1/items', router);
  app.use(errorHandler);

  return { app, registry };
}

describe('createRouteBuilder', () => {
  const { app, registry } = createTestApp();

  it('passes parsed and coerced input to the handler', async () => {
    const res = await request(app).post('/api/v1/items/42?dryRun=true').send({ title: 'Read' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ echo: { id: '42', dryRun: true, title: 'Read' } });
  });

  it.each([
    ['params', '/api/v1/items/abc', { title: 'Read' }, 'id'],
    ['query', '/api/v1/items/42?dryRun=maybe', { title: 'Read' }, 'dryRun'],
    ['body', '/api/v1/items/42', { title: '' }, 'title'],
  ])('rejects invalid %s with a 422', async (_part, url, body, path) => {
    const res = await request(app).post(url).send(body);

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({
      code: 'VALIDATION_ERROR',
      details: { issues: [expect.objectContaining({ path })] },
    });
  });

  it('documents every route in the OpenAPI registry', () => {
    const document = buildOpenApiDocument(registry);

    expect(Object.keys(document.paths ?? {})).toEqual(['/api/v1/items/{id}', '/api/v1/items']);

    const update = document.paths?.['/api/v1/items/{id}']?.post;
    expect(update?.operationId).toBe('updateItem');
    expect(update?.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'id', in: 'path' }),
        expect.objectContaining({ name: 'dryRun', in: 'query' }),
      ]),
    );
    expect(Object.keys(update?.responses ?? {})).toEqual(['200', '422', '500']);
  });

  it('only documents a 422 when the route validates input', () => {
    const document = buildOpenApiDocument(registry);

    const list = document.paths?.['/api/v1/items']?.get;
    expect(Object.keys(list?.responses ?? {})).toEqual(['204', '500']);
  });
});

describe('toOpenApiPath', () => {
  it.each([
    ['/api/v1/events/:id', '/api/v1/events/{id}'],
    ['/api/v1/events/:id/occurrences/:start', '/api/v1/events/{id}/occurrences/{start}'],
    ['/api/v1/health/', '/api/v1/health'],
    ['/', '/'],
  ])('converts %s', (input, expected) => {
    expect(toOpenApiPath(input)).toBe(expected);
  });
});
