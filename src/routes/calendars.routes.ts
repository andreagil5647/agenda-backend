import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import type { RequestHandler, Router } from 'express';
import type { CalendarsController } from '../controllers/calendars.controller.js';
import { createRouteBuilder } from '../openapi/define-route.js';
import {
  calendarOrderRequestSchema,
  calendarSchema,
  createCalendarRequestSchema,
  patchCalendarRequestSchema,
} from '../schemas/calendars.schemas.js';
import { objectIdParamSchema } from '../schemas/common.schemas.js';
import { notFound, unauthorized } from './responses.js';

export function createCalendarsRouter(
  registry: OpenAPIRegistry,
  mountPath: string,
  controller: CalendarsController,
  authMiddleware: RequestHandler,
): Router {
  const { router, route } = createRouteBuilder(registry, mountPath);
  router.use(authMiddleware);

  route({
    method: 'get',
    path: '/',
    operationId: 'listCalendars',
    summary: 'List calendars',
    tags: ['Calendars'],
    responses: {
      200: { description: 'Calendars', schema: calendarSchema.array() },
      401: unauthorized,
    },
    handler: controller.list,
  });

  route({
    method: 'post',
    path: '/',
    operationId: 'createCalendar',
    summary: 'Create a calendar',
    tags: ['Calendars'],
    request: { body: createCalendarRequestSchema },
    responses: {
      201: { description: 'Created calendar', schema: calendarSchema },
      401: unauthorized,
    },
    handler: controller.create,
  });

  route({
    method: 'patch',
    path: '/:id',
    operationId: 'updateCalendar',
    summary: 'Update a calendar',
    tags: ['Calendars'],
    request: { params: objectIdParamSchema, body: patchCalendarRequestSchema },
    responses: { 200: { description: 'Updated calendar', schema: calendarSchema }, 404: notFound },
    handler: controller.update,
  });

  route({
    method: 'delete',
    path: '/:id',
    operationId: 'deleteCalendar',
    summary: 'Delete a calendar',
    tags: ['Calendars'],
    request: { params: objectIdParamSchema },
    responses: { 204: { description: 'Deleted calendar' }, 404: notFound },
    handler: controller.remove,
  });

  route({
    method: 'put',
    path: '/order',
    operationId: 'reorderCalendars',
    summary: 'Reorder calendars',
    tags: ['Calendars'],
    request: { body: calendarOrderRequestSchema },
    responses: { 200: { description: 'Reordered calendars', schema: calendarSchema.array() } },
    handler: controller.reorder,
  });

  return router;
}
