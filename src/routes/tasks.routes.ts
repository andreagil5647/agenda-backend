import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import type { RequestHandler, Router } from 'express';
import type { TasksController } from '../controllers/tasks.controller.js';
import { createRouteBuilder } from '../openapi/define-route.js';
import { objectIdParamSchema } from '../schemas/common.schemas.js';
import {
  createTaskRequestSchema,
  moveTaskRequestSchema,
  patchTaskRequestSchema,
  taskSchema,
  tasksQuerySchema,
} from '../schemas/tasks.schemas.js';
import { notFound } from './responses.js';

export function createTasksRouter(
  registry: OpenAPIRegistry,
  mountPath: string,
  controller: TasksController,
  authMiddleware: RequestHandler,
): Router {
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
    handler: controller.list,
  });

  route({
    method: 'post',
    path: '/',
    operationId: 'createTask',
    summary: 'Create a task',
    tags: ['Tasks'],
    request: { body: createTaskRequestSchema },
    responses: { 201: { description: 'Created task', schema: taskSchema } },
    handler: controller.create,
  });

  route({
    method: 'patch',
    path: '/:id',
    operationId: 'updateTask',
    summary: 'Update a task',
    tags: ['Tasks'],
    request: { params: objectIdParamSchema, body: patchTaskRequestSchema },
    responses: { 200: { description: 'Updated task', schema: taskSchema }, 404: notFound },
    handler: controller.update,
  });

  route({
    method: 'delete',
    path: '/:id',
    operationId: 'deleteTask',
    summary: 'Delete a task',
    tags: ['Tasks'],
    request: { params: objectIdParamSchema },
    responses: { 204: { description: 'Deleted task' }, 404: notFound },
    handler: controller.remove,
  });

  route({
    method: 'post',
    path: '/:id/restore',
    operationId: 'restoreTask',
    summary: 'Restore a deleted task',
    tags: ['Tasks'],
    request: { params: objectIdParamSchema },
    responses: { 201: { description: 'Restored task', schema: taskSchema }, 404: notFound },
    handler: controller.restore,
  });

  route({
    method: 'put',
    path: '/:id/position',
    operationId: 'moveTask',
    summary: 'Move a task',
    tags: ['Tasks'],
    request: { params: objectIdParamSchema, body: moveTaskRequestSchema },
    responses: { 200: { description: 'Moved task', schema: taskSchema }, 404: notFound },
    handler: controller.move,
  });

  return router;
}
