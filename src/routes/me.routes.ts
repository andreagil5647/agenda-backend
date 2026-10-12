import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import type { RequestHandler, Router } from 'express';
import type { MeController } from '../controllers/me.controller.js';
import { createRouteBuilder } from '../openapi/define-route.js';
import { meResponseSchema, patchSettingsRequestSchema } from '../schemas/me.schemas.js';
import { unauthorized } from './responses.js';

export function createMeRouter(
  registry: OpenAPIRegistry,
  mountPath: string,
  controller: MeController,
  authMiddleware: RequestHandler,
): Router {
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
    handler: controller.get,
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
