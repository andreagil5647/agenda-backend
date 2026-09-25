import { rateLimit } from 'express-rate-limit';
import { RateLimitedError } from '../errors/app-error.js';

/**
 * Per-IP limiter kept in memory. The API runs as a single instance, so a
 * shared store is not needed; counters reset when the instance restarts.
 */
export function createRateLimiter(options: { windowMs: number; max: number }) {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) => {
      next(new RateLimitedError());
    },
  });
}
