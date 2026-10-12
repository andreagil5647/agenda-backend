import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { Router } from 'express';
import type { Db } from 'mongodb';
import type { Logger } from 'pino';
import type { Config } from '../config/env.js';
import { AuthController } from '../controllers/auth.controller.js';
import { CalendarsController } from '../controllers/calendars.controller.js';
import { DemoController } from '../controllers/demo.controller.js';
import { EventsController } from '../controllers/events.controller.js';
import { HealthController } from '../controllers/health.controller.js';
import { MeController } from '../controllers/me.controller.js';
import { TasksController } from '../controllers/tasks.controller.js';
import { createAuthMiddleware } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rate-limit.js';
import { createRequestIntegrityMiddleware } from '../middleware/request-integrity.js';
import { CalendarsRepository } from '../repositories/calendars.repository.js';
import { EventsRepository } from '../repositories/events.repository.js';
import { SessionsRepository } from '../repositories/sessions.repository.js';
import { TasksRepository } from '../repositories/tasks.repository.js';
import { UsersRepository } from '../repositories/users.repository.js';
import { AuthService } from '../services/auth.service.js';
import { CalendarsService } from '../services/calendars.service.js';
import { DemoService } from '../services/demo.service.js';
import { EventsService } from '../services/events.service.js';
import { HealthService } from '../services/health.service.js';
import { MeService } from '../services/me.service.js';
import { TasksService } from '../services/tasks.service.js';
import { createAuthRouter } from './auth.routes.js';
import { createCalendarsRouter } from './calendars.routes.js';
import { createDemoRouter } from './demo.routes.js';
import { createEventsRouter } from './events.routes.js';
import { createHealthRouter } from './health.routes.js';
import { createMeRouter } from './me.routes.js';
import { createTasksRouter } from './tasks.routes.js';

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

  const users = new UsersRepository(db);
  const sessions = new SessionsRepository(db);
  const calendars = new CalendarsRepository(db);
  const tasks = new TasksRepository(db);
  const events = new EventsRepository(db);

  const authService = new AuthService({ users, sessions });
  const demoService = new DemoService({ users, calendars, tasks, events }, authService);
  const authMiddleware = createAuthMiddleware(authService);

  const authController = new AuthController(authService);
  const demoController = new DemoController(demoService);
  const meController = new MeController(
    new MeService({ users, sessions, calendars, tasks, events }),
  );
  const calendarsController = new CalendarsController(new CalendarsService(calendars));
  const tasksController = new TasksController(new TasksService(tasks));
  const eventsController = new EventsController(new EventsService({ events, calendars }));

  const mount = (path: string): string => `${API_BASE_PATH}${path}`;
  router.use('/auth/demo', createDemoRouter(registry, mount('/auth/demo'), demoController));
  router.use('/auth', createAuthRouter(registry, mount('/auth'), authController));
  router.use('/me', createMeRouter(registry, mount('/me'), meController, authMiddleware));
  router.use(
    '/calendars',
    createCalendarsRouter(registry, mount('/calendars'), calendarsController, authMiddleware),
  );
  router.use(
    '/tasks',
    createTasksRouter(registry, mount('/tasks'), tasksController, authMiddleware),
  );
  router.use(
    '/events',
    createEventsRouter(registry, mount('/events'), eventsController, authMiddleware),
  );

  return router;
}
