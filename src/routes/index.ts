import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { Router } from 'express';
import type { Db } from 'mongodb';
import type { Logger } from 'pino';
import type { Config } from '../config/env.js';
import { AuthController } from '../controllers/auth.controller.js';
import { HealthController } from '../controllers/health.controller.js';
import { PlannerController } from '../controllers/planner.controller.js';
import { createAuthMiddleware } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rate-limit.js';
import { createRequestIntegrityMiddleware } from '../middleware/request-integrity.js';
import { SessionsRepository } from '../repositories/sessions.repository.js';
import { UsersRepository } from '../repositories/users.repository.js';
import { AuthService } from '../services/auth.service.js';
import { HealthService } from '../services/health.service.js';
import { PlannerService } from '../services/planner.service.js';
import { createAuthRouter } from './auth.routes.js';
import { createHealthRouter } from './health.routes.js';
import { createPlannerRouter } from './planner.routes.js';

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
  router.use(createRequestIntegrityMiddleware(config));

  const usersRepository = new UsersRepository(db);
  const sessionsRepository = new SessionsRepository(db);
  const authService = new AuthService({ users: usersRepository, sessions: sessionsRepository });
  const plannerService = new PlannerService({
    users: usersRepository,
    sessions: sessionsRepository,
  });
  const authController = new AuthController(authService);
  const plannerController = new PlannerController(plannerService);
  const authMiddleware = createAuthMiddleware(authService);
  router.use('/auth', createAuthRouter(registry, `${API_BASE_PATH}/auth`, authController));
  const [meRouter] = createPlannerRouter(
    registry,
    API_BASE_PATH,
    plannerController,
    authMiddleware,
  );
  router.use('/me', meRouter);

  return router;
}
