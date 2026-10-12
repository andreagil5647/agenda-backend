import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import type { AuthController } from '../controllers/auth.controller.js';
import { errorResponseSchema } from '../schemas/common.schemas.js';
import {
  authenticatedSessionSchema,
  loginRequestSchema,
  registerRequestSchema,
  sessionResponseSchema,
} from '../schemas/auth.schemas.js';
import { createRouteBuilder } from '../openapi/define-route.js';

export function createAuthRouter(
  registry: OpenAPIRegistry,
  mountPath: string,
  controller: AuthController,
) {
  const { router, route } = createRouteBuilder(registry, mountPath);

  route({
    method: 'post',
    path: '/register',
    operationId: 'register',
    summary: 'Register a user',
    tags: ['Auth'],
    request: { body: registerRequestSchema },
    responses: {
      201: { description: 'Registered and signed in', schema: authenticatedSessionSchema },
      409: { description: 'Email is already registered', schema: errorResponseSchema },
    },
    handler: controller.register,
  });

  route({
    method: 'post',
    path: '/login',
    operationId: 'login',
    summary: 'Log in',
    tags: ['Auth'],
    request: { body: loginRequestSchema },
    responses: {
      200: { description: 'Signed in', schema: authenticatedSessionSchema },
      401: { description: 'Invalid credentials', schema: errorResponseSchema },
    },
    handler: controller.login,
  });

  route({
    method: 'post',
    path: '/logout',
    operationId: 'logout',
    summary: 'Log out',
    tags: ['Auth'],
    responses: {
      204: { description: 'Signed out' },
      403: { description: 'CSRF token is missing or invalid', schema: errorResponseSchema },
    },
    handler: controller.logout,
  });

  route({
    method: 'get',
    path: '/session',
    operationId: 'getSession',
    summary: 'Get the current auth session',
    tags: ['Auth'],
    responses: {
      200: {
        description: 'Current auth session, or anonymous state',
        schema: sessionResponseSchema,
      },
    },
    handler: controller.getSession,
  });

  return router;
}
