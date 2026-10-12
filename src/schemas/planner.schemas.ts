import { z } from 'zod';
import { authUserSchema, userSettingsSchema } from './auth.schemas.js';

export const objectIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-f]{24}$/i),
});

export const isoDateSchema = z.iso.date();
export const isoDateTimeSchema = z.iso.datetime();

export const meResponseSchema = authUserSchema.meta({ id: 'MeResponse' });

export const patchSettingsRequestSchema = userSettingsSchema.partial().meta({
  id: 'PatchSettingsRequest',
});

export const calendarSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    colorKey: z.string(),
    visible: z.boolean(),
    defaultReminderMinutes: z.array(z.number().int().nonnegative()),
    order: z.number(),
    version: z.number().int().positive(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .meta({ id: 'Calendar' });

export const createCalendarRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    colorKey: z.string().trim().min(1).max(32).default('blue'),
    visible: z.boolean().default(true),
    defaultReminderMinutes: z.array(z.number().int().min(0).max(10_080)).default([]),
  })
  .meta({ id: 'CreateCalendarRequest' });

export const patchCalendarRequestSchema = createCalendarRequestSchema.partial().meta({
  id: 'PatchCalendarRequest',
});

export const calendarOrderRequestSchema = z
  .object({
    calendarIds: z.array(z.string().regex(/^[0-9a-f]{24}$/i)).min(1),
  })
  .meta({ id: 'CalendarOrderRequest' });

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
    beforeId: z
      .string()
      .regex(/^[0-9a-f]{24}$/i)
      .nullable()
      .optional(),
    afterId: z
      .string()
      .regex(/^[0-9a-f]{24}$/i)
      .nullable()
      .optional(),
  })
  .meta({ id: 'MoveTaskRequest' });

export const eventSchema = z
  .object({
    id: z.string(),
    calendarId: z.string(),
    title: z.string(),
    notes: z.string().nullable(),
    taskId: z.string().nullable(),
    kind: z.enum(['timed', 'allDay']),
    startUtc: isoDateTimeSchema.nullable(),
    endUtc: isoDateTimeSchema.nullable(),
    timeZone: z.string().nullable(),
    startDate: isoDateSchema.nullable(),
    endDate: isoDateSchema.nullable(),
    version: z.number().int().positive(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .meta({ id: 'Event' });

export const eventsQuerySchema = z.object({
  from: isoDateTimeSchema,
  to: isoDateTimeSchema,
  calendarIds: z
    .string()
    .optional()
    .transform((value) => value?.split(',').filter(Boolean)),
});

export const createEventRequestSchema = z
  .discriminatedUnion('kind', [
    z.object({
      kind: z.literal('timed'),
      calendarId: z.string().regex(/^[0-9a-f]{24}$/i),
      title: z.string().trim().min(1).max(160),
      notes: z.string().trim().max(2_000).nullish(),
      taskId: z
        .string()
        .regex(/^[0-9a-f]{24}$/i)
        .nullish(),
      startUtc: isoDateTimeSchema,
      endUtc: isoDateTimeSchema,
      timeZone: z.string().trim().min(1).max(80),
    }),
    z.object({
      kind: z.literal('allDay'),
      calendarId: z.string().regex(/^[0-9a-f]{24}$/i),
      title: z.string().trim().min(1).max(160),
      notes: z.string().trim().max(2_000).nullish(),
      taskId: z
        .string()
        .regex(/^[0-9a-f]{24}$/i)
        .nullish(),
      startDate: isoDateSchema,
      endDate: isoDateSchema,
    }),
  ])
  .meta({ id: 'CreateEventRequest' });

export const patchEventRequestSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    notes: z.string().trim().max(2_000).nullable().optional(),
    calendarId: z
      .string()
      .regex(/^[0-9a-f]{24}$/i)
      .optional(),
    taskId: z
      .string()
      .regex(/^[0-9a-f]{24}$/i)
      .nullable()
      .optional(),
    startUtc: isoDateTimeSchema.optional(),
    endUtc: isoDateTimeSchema.optional(),
    timeZone: z.string().trim().min(1).max(80).optional(),
    startDate: isoDateSchema.optional(),
    endDate: isoDateSchema.optional(),
  })
  .meta({ id: 'PatchEventRequest' });

export type PatchSettingsRequest = z.infer<typeof patchSettingsRequestSchema>;
export type CreateCalendarRequest = z.infer<typeof createCalendarRequestSchema>;
export type PatchCalendarRequest = z.infer<typeof patchCalendarRequestSchema>;
export type CalendarOrderRequest = z.infer<typeof calendarOrderRequestSchema>;
export type CreateTaskRequest = z.infer<typeof createTaskRequestSchema>;
export type PatchTaskRequest = z.infer<typeof patchTaskRequestSchema>;
export type MoveTaskRequest = z.infer<typeof moveTaskRequestSchema>;
export type TasksQuery = z.infer<typeof tasksQuerySchema>;
export type CreateEventRequest = z.infer<typeof createEventRequestSchema>;
export type PatchEventRequest = z.infer<typeof patchEventRequestSchema>;
export type EventsQuery = z.infer<typeof eventsQuerySchema>;
