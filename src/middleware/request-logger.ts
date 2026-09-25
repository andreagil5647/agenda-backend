import { randomUUID } from 'node:crypto';
import type { Logger } from 'pino';
import { pinoHttp } from 'pino-http';

const REQUEST_ID_PATTERN = /^[\w-]{8,64}$/;

/**
 * Logs one line per request and tags it with a request id. A well-formed
 * X-Request-Id from the caller is reused so a request can be traced across
 * the web app and the API; otherwise a new UUID is generated.
 */
export function createRequestLogger(logger: Logger, quietPathPrefix: string) {
  return pinoHttp({
    logger,
    genReqId: (req, res) => {
      const incoming = req.headers['x-request-id'];
      const id =
        typeof incoming === 'string' && REQUEST_ID_PATTERN.test(incoming) ? incoming : randomUUID();
      res.setHeader('X-Request-Id', id);
      return id;
    },
    customLogLevel: (_req, res, error) => {
      if (error ?? res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    // Headers are left out: they are mostly noise and the likeliest place for
    // secrets. Client IPs are left out as personal data.
    serializers: {
      req: (req: { id: unknown; method: string; url: string }) => ({
        id: req.id,
        method: req.method,
        url: req.url,
      }),
      res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
    },
    // Health checks run every few seconds (platform probe, client warm-up)
    // and would drown out the useful lines.
    autoLogging: { ignore: (req) => req.url?.startsWith(quietPathPrefix) ?? false },
  });
}
