import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import type { Router } from 'express';
import type { DemoController } from '../controllers/demo.controller.js';
import { createRouteBuilder } from '../openapi/define-route.js';
import { authenticatedSessionSchema } from '../schemas/auth.schemas.js';

export function createDemoRouter(
  registry: OpenAPIRegistry,
  mountPath: string,
  controller: DemoController,
): Router {
  const { router, route } = createRouteBuilder(registry, mountPath);

  route({
    method: 'post',
    path: '/',
    operationId: 'createDemoSession',
    summary: 'Start a seeded demo session',
    tags: ['Auth'],
    responses: {
      201: { description: 'Demo user created and signed in', schema: authenticatedSessionSchema },
    },
    handler: controller.start,
  });

  return router;
}
