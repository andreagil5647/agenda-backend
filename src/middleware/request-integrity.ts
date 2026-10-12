import type { RequestHandler } from 'express';
import type { Config } from '../config/env.js';
import { ForbiddenError } from '../errors/app-error.js';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const ALLOWED_FETCH_SITES = new Set(['same-origin', 'same-site', 'none']);

export function createRequestIntegrityMiddleware(config: Config): RequestHandler {
  return (req, _res, next) => {
    if (!UNSAFE_METHODS.has(req.method)) {
      next();
      return;
    }

    const secFetchSite = req.get('Sec-Fetch-Site')?.toLowerCase();
    if (secFetchSite && !ALLOWED_FETCH_SITES.has(secFetchSite)) {
      next(new ForbiddenError('Cross-site requests are not allowed'));
      return;
    }

    const origin = req.get('Origin');
    if (origin && !config.http.corsOrigins.includes(origin)) {
      next(new ForbiddenError('Request origin is not allowed'));
      return;
    }

    next();
  };
}
