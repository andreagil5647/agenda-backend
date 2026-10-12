import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import type { Router } from 'express';
import type { HealthController } from '../controllers/health.controller.js';
import { createRouteBuilder } from '../openapi/define-route.js';
import { livenessSchema, readinessSchema } from '../schemas/health.schemas.js';

export function createHealthRouter(
  registry: OpenAPIRegistry,
  mountPath: string,
  controller: HealthController,
): Router {
  const { router, route } = createRouteBuilder(registry, mountPath);

  route({
    method: 'get',
    path: '/',
    operationId: 'getLiveness',
    summary: 'Liveness probe',
    description:
      'Answers as soon as the process is running and never touches the database. ' +
      'Used by the hosting health check and by the web app to wake the service after it ' +
      'has been idle. Not rate limited.',
    tags: ['Health'],
    responses: { 200: { description: 'The process is running', schema: livenessSchema } },
    handler: controller.getLiveness,
  });

  route({
    method: 'get',
    path: '/ready',
    operationId: 'getReadiness',
    summary: 'Readiness probe',
    description: 'Checks that the database answers within two seconds. Not rate limited.',
    tags: ['Health'],
    responses: {
      200: { description: 'Ready to serve requests', schema: readinessSchema },
      503: { description: 'A dependency is unavailable', schema: readinessSchema },
    },
    handler: controller.getReadiness,
  });

  return router;
}
