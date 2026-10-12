import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import type { Router } from 'express';
import type { DemoController } from '../controllers/demo.controller.js';
import { createRouteBuilder } from '../openapi/define-route.js';
import { authenticatedSessionSchema, demoRequestSchema } from '../schemas/auth.schemas.js';
import { errorResponseSchema } from '../schemas/common.schemas.js';

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
    request: { body: demoRequestSchema },
    responses: {
      201: { description: 'Demo user created and signed in', schema: authenticatedSessionSchema },
      429: {
        description: 'Too many demo sign-ins from this address, or the demo is full',
        schema: errorResponseSchema,
      },
    },
    handler: controller.start,
  });

  return router;
}
