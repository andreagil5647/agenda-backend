import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Db } from 'mongodb';
import type { Logger } from 'pino';
import swaggerUi from 'swagger-ui-express';
import type { Config } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { createRequestLogger } from './middleware/request-logger.js';
import { buildOpenApiDocument, type OpenApiDocument } from './openapi/document.js';
import { API_BASE_PATH, createApiRouter } from './routes/index.js';

export interface AppDependencies {
  config: Config;
  logger: Logger;
  db: Db;
}

export interface App {
  app: Express;
  openApiDocument: OpenApiDocument;
}

export function createApp({ config, logger, db }: AppDependencies): App {
  const app = express();

  // Render terminates TLS in front of the service; trusting exactly that many
  // hops makes req.ip the real client address without letting clients spoof it.
  app.set('trust proxy', config.http.trustProxyHops);
  app.disable('x-powered-by');

  app.use(createRequestLogger(logger, `${API_BASE_PATH}/health`));
  app.use(helmet());
  app.use(
    cors({
      origin: config.http.corsOrigins,
      credentials: true,
      exposedHeaders: ['X-Request-Id', 'ETag', 'RateLimit', 'RateLimit-Policy', 'Retry-After'],
    }),
  );
  app.use(express.json({ limit: '100kb' }));

  const registry = new OpenAPIRegistry();
  app.use(API_BASE_PATH, createApiRouter({ config, logger, db, registry }));

  // Built after the routers are created, because creating them fills the registry.
  const openApiDocument = buildOpenApiDocument(registry);
  app.get('/api/openapi.json', (_req, res) => {
    res.json(openApiDocument);
  });
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, { customSiteTitle: 'Agenda API docs' }),
  );

  app.use(notFoundHandler);
  app.use(errorHandler);

  return { app, openApiDocument };
}
