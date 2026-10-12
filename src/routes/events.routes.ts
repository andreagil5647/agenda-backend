import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import type { RequestHandler, Router } from 'express';
import type { EventsController } from '../controllers/events.controller.js';
import { createRouteBuilder } from '../openapi/define-route.js';
import { objectIdParamSchema } from '../schemas/common.schemas.js';
import {
  createEventRequestSchema,
  eventSchema,
  eventsQuerySchema,
  patchEventRequestSchema,
} from '../schemas/events.schemas.js';
import { notFound } from './responses.js';

export function createEventsRouter(
  registry: OpenAPIRegistry,
  mountPath: string,
  controller: EventsController,
  authMiddleware: RequestHandler,
): Router {
  const { router, route } = createRouteBuilder(registry, mountPath);
  router.use(authMiddleware);

  route({
    method: 'get',
    path: '/',
    operationId: 'listEvents',
    summary: 'List event instances in a range',
    tags: ['Events'],
    request: { query: eventsQuerySchema },
    responses: { 200: { description: 'Events', schema: eventSchema.array() } },
    handler: controller.list,
  });

  route({
    method: 'post',
    path: '/',
    operationId: 'createEvent',
    summary: 'Create a non-recurring event',
    tags: ['Events'],
    request: { body: createEventRequestSchema },
    responses: { 201: { description: 'Created event', schema: eventSchema } },
    handler: controller.create,
  });

  route({
    method: 'patch',
    path: '/:id',
    operationId: 'updateEvent',
    summary: 'Update a non-recurring event',
    tags: ['Events'],
    request: { params: objectIdParamSchema, body: patchEventRequestSchema },
    responses: { 200: { description: 'Updated event', schema: eventSchema }, 404: notFound },
    handler: controller.update,
  });

  route({
    method: 'delete',
    path: '/:id',
    operationId: 'deleteEvent',
    summary: 'Delete a non-recurring event',
    tags: ['Events'],
    request: { params: objectIdParamSchema },
    responses: { 204: { description: 'Deleted event' }, 404: notFound },
    handler: controller.remove,
  });

  return router;
}
