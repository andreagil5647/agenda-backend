import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import type { RequestHandler, Router } from 'express';
import type { PlannerController } from '../controllers/planner.controller.js';
import { errorResponseSchema } from '../schemas/common.schemas.js';
import { meResponseSchema, patchSettingsRequestSchema } from '../schemas/me.schemas.js';
import {
  calendarOrderRequestSchema,
  calendarSchema,
  createCalendarRequestSchema,
  patchCalendarRequestSchema,
} from '../schemas/calendars.schemas.js';
import {
  createTaskRequestSchema,
  moveTaskRequestSchema,
  patchTaskRequestSchema,
  taskSchema,
  tasksQuerySchema,
} from '../schemas/tasks.schemas.js';
import {
  createEventRequestSchema,
  eventSchema,
  eventsQuerySchema,
  patchEventRequestSchema,
} from '../schemas/events.schemas.js';
import { objectIdParamSchema } from '../schemas/common.schemas.js';
import { createRouteBuilder, type RouteResponse } from '../openapi/define-route.js';

const unauthorized: RouteResponse = {
  description: 'Authentication required',
  schema: errorResponseSchema,
};
const notFound: RouteResponse = { description: 'Resource not found', schema: errorResponseSchema };

export function createPlannerRouter(
  registry: OpenAPIRegistry,
  basePath: string,
  controller: PlannerController,
  authMiddleware: RequestHandler,
): [Router, Router, Router, Router] {
  return [
    createMeRouter(registry, `${basePath}/me`, controller, authMiddleware),
    createCalendarsRouter(registry, `${basePath}/calendars`, controller, authMiddleware),
    createTasksRouter(registry, `${basePath}/tasks`, controller, authMiddleware),
    createEventsRouter(registry, `${basePath}/events`, controller, authMiddleware),
  ];
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

function createCalendarsRouter(
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
    operationId: 'listCalendars',
    summary: 'List calendars',
    tags: ['Calendars'],
    responses: {
      200: { description: 'Calendars', schema: calendarSchema.array() },
      401: unauthorized,
    },
    handler: controller.listCalendars,
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
    handler: controller.createCalendar,
  });

  route({
    method: 'patch',
    path: '/:id',
    operationId: 'updateCalendar',
    summary: 'Update a calendar',
    tags: ['Calendars'],
    request: { params: objectIdParamSchema, body: patchCalendarRequestSchema },
    responses: { 200: { description: 'Updated calendar', schema: calendarSchema }, 404: notFound },
    handler: controller.updateCalendar,
  });

  route({
    method: 'delete',
    path: '/:id',
    operationId: 'deleteCalendar',
    summary: 'Delete a calendar',
    tags: ['Calendars'],
    request: { params: objectIdParamSchema },
    responses: { 204: { description: 'Deleted calendar' }, 404: notFound },
    handler: controller.deleteCalendar,
  });

  route({
    method: 'put',
    path: '/order',
    operationId: 'reorderCalendars',
    summary: 'Reorder calendars',
    tags: ['Calendars'],
    request: { body: calendarOrderRequestSchema },
    responses: { 200: { description: 'Reordered calendars', schema: calendarSchema.array() } },
    handler: controller.reorderCalendars,
  });

  return router;
}

function createTasksRouter(
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
    operationId: 'listTasks',
    summary: 'List tasks',
    tags: ['Tasks'],
    request: { query: tasksQuerySchema },
    responses: { 200: { description: 'Tasks', schema: taskSchema.array() } },
    handler: controller.listTasks,
  });

  route({
    method: 'post',
    path: '/',
    operationId: 'createTask',
    summary: 'Create a task',
    tags: ['Tasks'],
    request: { body: createTaskRequestSchema },
    responses: { 201: { description: 'Created task', schema: taskSchema } },
    handler: controller.createTask,
  });

  route({
    method: 'patch',
    path: '/:id',
    operationId: 'updateTask',
    summary: 'Update a task',
    tags: ['Tasks'],
    request: { params: objectIdParamSchema, body: patchTaskRequestSchema },
    responses: { 200: { description: 'Updated task', schema: taskSchema }, 404: notFound },
    handler: controller.updateTask,
  });

  route({
    method: 'delete',
    path: '/:id',
    operationId: 'deleteTask',
    summary: 'Delete a task',
    tags: ['Tasks'],
    request: { params: objectIdParamSchema },
    responses: { 204: { description: 'Deleted task' }, 404: notFound },
    handler: controller.deleteTask,
  });

  route({
    method: 'post',
    path: '/:id/restore',
    operationId: 'restoreTask',
    summary: 'Restore a deleted task',
    tags: ['Tasks'],
    request: { params: objectIdParamSchema },
    responses: { 201: { description: 'Restored task', schema: taskSchema }, 404: notFound },
    handler: controller.restoreTask,
  });

  route({
    method: 'put',
    path: '/:id/position',
    operationId: 'moveTask',
    summary: 'Move a task',
    tags: ['Tasks'],
    request: { params: objectIdParamSchema, body: moveTaskRequestSchema },
    responses: { 200: { description: 'Moved task', schema: taskSchema }, 404: notFound },
    handler: controller.moveTask,
  });

  return router;
}

function createEventsRouter(
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
    operationId: 'listEvents',
    summary: 'List event instances in a range',
    tags: ['Events'],
    request: { query: eventsQuerySchema },
    responses: { 200: { description: 'Events', schema: eventSchema.array() } },
    handler: controller.listEvents,
  });

  route({
    method: 'post',
    path: '/',
    operationId: 'createEvent',
    summary: 'Create a non-recurring event',
    tags: ['Events'],
    request: { body: createEventRequestSchema },
    responses: { 201: { description: 'Created event', schema: eventSchema } },
    handler: controller.createEvent,
  });

  route({
    method: 'patch',
    path: '/:id',
    operationId: 'updateEvent',
    summary: 'Update a non-recurring event',
    tags: ['Events'],
    request: { params: objectIdParamSchema, body: patchEventRequestSchema },
    responses: { 200: { description: 'Updated event', schema: eventSchema }, 404: notFound },
    handler: controller.updateEvent,
  });

  route({
    method: 'delete',
    path: '/:id',
    operationId: 'deleteEvent',
    summary: 'Delete a non-recurring event',
    tags: ['Events'],
    request: { params: objectIdParamSchema },
    responses: { 204: { description: 'Deleted event' }, 404: notFound },
    handler: controller.deleteEvent,
  });

  return router;
}
