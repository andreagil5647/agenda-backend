import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { Router } from 'express';
import type { Db } from 'mongodb';
import type { Logger } from 'pino';
import type { Config } from '../config/env.js';
import { HealthController } from '../controllers/health.controller.js';
import { createRateLimiter } from '../middleware/rate-limit.js';
import { HealthService } from '../services/health.service.js';
import { createHealthRouter } from './health.routes.js';

export const API_BASE_PATH = '/api/v1';

export interface ApiRouterDependencies {
  config: Config;
  logger: Logger;
  db: Db;
  registry: OpenAPIRegistry;
}

export function createApiRouter({ config, logger, db, registry }: ApiRouterDependencies): Router {
  const router = Router();

  // API responses are per-user and must never be cached by proxies or the browser.
  router.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  const healthController = new HealthController(new HealthService(db, logger, config.version));
  router.use('/health', createHealthRouter(registry, `${API_BASE_PATH}/health`, healthController));

  // Everything below the health checks is rate limited. The web app polls
  // /health while the service wakes up, so those requests must not count.
  router.use(createRateLimiter(config.http.rateLimit));

  return router;
}
