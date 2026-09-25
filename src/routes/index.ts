import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { Router } from 'express';
import type { Config } from '../config/env.js';
import { createRateLimiter } from '../middleware/rate-limit.js';

export const API_BASE_PATH = '/api/v1';

export interface ApiRouterDependencies {
  config: Config;
  registry: OpenAPIRegistry;
}

export function createApiRouter({ config }: ApiRouterDependencies): Router {
  const router = Router();

  // API responses are per-user and must never be cached by proxies or the browser.
  router.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  router.use(createRateLimiter(config.http.rateLimit));

  return router;
}
