import express from 'express';
import { pino } from 'pino';
import { pinoHttp } from 'pino-http';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ConflictError } from '../errors/app-error.js';
import { errorHandler, notFoundHandler } from './error-handler.js';

function createTestApp() {
  const app = express();
  app.use(pinoHttp({ logger: pino({ level: 'silent' }), genReqId: () => 'req-1' }));
  app.use(express.json({ limit: '1kb' }));

  app.get('/conflict', () => {
    throw new ConflictError('Calendar name already used', { field: 'name' });
  });
  app.get('/validation', () => {
    z.object({ title: z.string().min(1) }).parse({ title: '' });
  });
  app.get('/crash', async () => {
    await Promise.resolve();
    throw new Error('connection string mongodb://user:secret@host leaked');
  });
  app.post('/echo', (req, res) => {
    res.json(req.body);
  });

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

describe('errorHandler', () => {
  const app = createTestApp();

  it('serialises an AppError with its status, code and details', async () => {
    const res = await request(app).get('/conflict');

    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      code: 'CONFLICT',
      message: 'Calendar name already used',
      details: { field: 'name' },
      requestId: 'req-1',
    });
  });

  it('turns a ZodError into a 422 with the failing paths', async () => {
    const res = await request(app).get('/validation');

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({
      code: 'VALIDATION_ERROR',
      details: { issues: [{ path: 'title', code: 'too_small' }] },
    });
  });

  it('hides the message of unexpected errors', async () => {
    const res = await request(app).get('/crash');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong on our side',
      requestId: 'req-1',
    });
    expect(JSON.stringify(res.body)).not.toContain('secret');
  });

  it('rejects malformed JSON with a 400', async () => {
    const res = await request(app)
      .post('/echo')
      .set('Content-Type', 'application/json')
      .send('{"title":');

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('rejects oversized bodies with a 413', async () => {
    const res = await request(app)
      .post('/echo')
      .send({ notes: 'x'.repeat(2048) });

    expect(res.status).toBe(413);
    expect(res.body).toMatchObject({ code: 'PAYLOAD_TOO_LARGE' });
  });

  it('answers unknown routes with a 404 in the same shape', async () => {
    const res = await request(app).delete('/nowhere');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      code: 'NOT_FOUND',
      message: 'Route DELETE /nowhere not found',
      requestId: 'req-1',
    });
  });
});
