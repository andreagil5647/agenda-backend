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

// The fields a client can set, without defaults. A default belongs to creation
// only: on an update an absent field means "leave it alone", and zod would
// fill a defaulted field in, overwriting the stored value.
const taskFields = {
  title: z.string().trim().min(1).max(160),
  dueDate: isoDateSchema.nullable(),
  priority: taskPrioritySchema,
  status: taskStatusSchema,
  estimateMinutes: z
    .number()
    .int()
    .min(5)
    .max(24 * 60),
};

export const createTaskRequestSchema = z
  .object({
    title: taskFields.title,
    dueDate: taskFields.dueDate.optional(),
    priority: taskFields.priority.default('none'),
    status: taskFields.status.default('todo'),
    estimateMinutes: taskFields.estimateMinutes.default(30),
  })
  .meta({ id: 'CreateTaskRequest' });

export const patchTaskRequestSchema = z.object(taskFields).partial().meta({
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
