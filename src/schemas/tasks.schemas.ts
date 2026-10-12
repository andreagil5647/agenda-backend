import { z } from 'zod';
import { isoDateSchema, isoDateTimeSchema, objectIdSchema } from './common.schemas.js';

export const taskPrioritySchema = z.enum(['none', 'low', 'medium', 'high']);
export const taskStatusSchema = z.enum(['todo', 'done']);

export const taskSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    dueDate: isoDateSchema.nullable(),
    priority: taskPrioritySchema,
    status: taskStatusSchema,
    estimateMinutes: z.number().int().positive(),
    order: z.string(),
    version: z.number().int().positive(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .meta({ id: 'Task' });

export const tasksQuerySchema = z.object({
  status: taskStatusSchema.optional(),
  due: isoDateSchema.optional(),
});

export const createTaskRequestSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    dueDate: isoDateSchema.nullish(),
    priority: taskPrioritySchema.default('none'),
    status: taskStatusSchema.default('todo'),
    estimateMinutes: z
      .number()
      .int()
      .min(5)
      .max(24 * 60)
      .default(30),
  })
  .meta({ id: 'CreateTaskRequest' });

export const patchTaskRequestSchema = createTaskRequestSchema.partial().meta({
  id: 'PatchTaskRequest',
});

export const moveTaskRequestSchema = z
  .object({
    beforeId: objectIdSchema.nullable().optional(),
    afterId: objectIdSchema.nullable().optional(),
  })
  .meta({ id: 'MoveTaskRequest' });

export type TasksQuery = z.infer<typeof tasksQuerySchema>;
export type CreateTaskRequest = z.infer<typeof createTaskRequestSchema>;
export type PatchTaskRequest = z.infer<typeof patchTaskRequestSchema>;
export type MoveTaskRequest = z.infer<typeof moveTaskRequestSchema>;
