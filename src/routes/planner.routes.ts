import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import type { RequestHandler, Router } from 'express';
import type { PlannerController } from '../controllers/planner.controller.js';
import { errorResponseSchema } from '../schemas/common.schemas.js';
import {
  calendarOrderRequestSchema,
  calendarSchema,
  createCalendarRequestSchema,
  createTaskRequestSchema,
  meResponseSchema,
  moveTaskRequestSchema,
  objectIdParamSchema,
  patchCalendarRequestSchema,
  patchSettingsRequestSchema,
  patchTaskRequestSchema,
  taskSchema,
  tasksQuerySchema,
} from '../schemas/planner.schemas.js';
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
): [Router, Router, Router] {
  return [
    createMeRouter(registry, `${basePath}/me`, controller, authMiddleware),
    createCalendarsRouter(registry, `${basePath}/calendars`, controller, authMiddleware),
    createTasksRouter(registry, `${basePath}/tasks`, controller, authMiddleware),
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
