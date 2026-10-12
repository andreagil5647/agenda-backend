import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { createLogger } from './logger.js';

function captureLogs() {
  const lines: Record<string, unknown>[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      lines.push(JSON.parse(chunk.toString()) as Record<string, unknown>);
      callback();
    },
  });
  return { lines, stream };
}

describe('createLogger', () => {
  it('redacts credentials and session cookies', () => {
    const { lines, stream } = captureLogs();
    const logger = createLogger({ env: 'production', log: { level: 'info' } }, stream);

    logger.info(
      {
        req: { headers: { cookie: 'session=abc', authorization: 'Bearer abc' } },
        res: { headers: { 'set-cookie': 'session=abc' } },
        body: { email: 'ana@example.com', password: 'hunter2' },
      },
      'request',
    );

    expect(lines[0]).toMatchObject({
      req: { headers: { cookie: '[redacted]', authorization: '[redacted]' } },
      res: { headers: { 'set-cookie': '[redacted]' } },
      body: { email: 'ana@example.com', password: '[redacted]' },
    });
  });

  it('respects the configured level', () => {
    const { lines, stream } = captureLogs();
    const logger = createLogger({ env: 'production', log: { level: 'warn' } }, stream);

    logger.info('hidden');
    logger.warn('shown');

    expect(lines.map((line) => line.msg)).toEqual(['shown']);
  });
});
