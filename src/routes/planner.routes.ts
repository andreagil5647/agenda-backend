import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import type { RequestHandler, Router } from 'express';
import type { PlannerController } from '../controllers/planner.controller.js';
import { errorResponseSchema } from '../schemas/common.schemas.js';
import { meResponseSchema, patchSettingsRequestSchema } from '../schemas/planner.schemas.js';
import { createRouteBuilder, type RouteResponse } from '../openapi/define-route.js';

const unauthorized: RouteResponse = {
  description: 'Authentication required',
  schema: errorResponseSchema,
};

export function createPlannerRouter(
  registry: OpenAPIRegistry,
  basePath: string,
  controller: PlannerController,
  authMiddleware: RequestHandler,
): [Router] {
  return [createMeRouter(registry, `${basePath}/me`, controller, authMiddleware)];
}

function createMeRouter(
  registry: OpenAPIRegistry,
  mountPath: string,
  controller: PlannerController,
  authMiddleware: RequestHandler,
) {
  const { router, route } = createRouteBuilder(registry, mountPath);
  router.use(authMiddleware);

  route({
    method: 'get',
    path: '/',
    operationId: 'getMe',
    summary: 'Get the current user',
    tags: ['Me'],
    responses: {
      200: { description: 'Current user', schema: meResponseSchema },
      401: unauthorized,
    },
    handler: controller.getMe,
  });

  route({
    method: 'patch',
    path: '/settings',
    operationId: 'updateMySettings',
    summary: 'Update current user settings',
    tags: ['Me'],
    request: { body: patchSettingsRequestSchema },
    responses: {
      200: { description: 'Updated user', schema: meResponseSchema },
      401: unauthorized,
    },
    handler: controller.updateSettings,
  });

  route({
    method: 'delete',
    path: '/',
    operationId: 'deleteMe',
    summary: 'Delete the current account',
    tags: ['Me'],
    responses: { 204: { description: 'Account deleted' }, 401: unauthorized },
    handler: controller.deleteAccount,
  });

  return router;
}
