import { z } from 'zod';
import {
  isoDateSchema,
  isoDateTimeSchema,
  objectIdSchema,
  timeZoneSchema,
} from './common.schemas.js';

const titleSchema = z.string().trim().min(1).max(160);
const notesSchema = z.string().trim().max(2_000);

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
      calendarId: objectIdSchema,
      title: titleSchema,
      notes: notesSchema.nullish(),
      taskId: objectIdSchema.nullish(),
      startUtc: isoDateTimeSchema,
      endUtc: isoDateTimeSchema,
      timeZone: timeZoneSchema,
    }),
    z.object({
      kind: z.literal('allDay'),
      calendarId: objectIdSchema,
      title: titleSchema,
      notes: notesSchema.nullish(),
      taskId: objectIdSchema.nullish(),
      startDate: isoDateSchema,
      endDate: isoDateSchema,
    }),
  ])
  .meta({ id: 'CreateEventRequest' });

export const patchEventRequestSchema = z
  .object({
    title: titleSchema.optional(),
    notes: notesSchema.nullable().optional(),
    calendarId: objectIdSchema.optional(),
    taskId: objectIdSchema.nullable().optional(),
    startUtc: isoDateTimeSchema.optional(),
    endUtc: isoDateTimeSchema.optional(),
    timeZone: timeZoneSchema.optional(),
    startDate: isoDateSchema.optional(),
    endDate: isoDateSchema.optional(),
  })
  .meta({ id: 'PatchEventRequest' });

export type EventsQuery = z.infer<typeof eventsQuerySchema>;
export type CreateEventRequest = z.infer<typeof createEventRequestSchema>;
export type PatchEventRequest = z.infer<typeof patchEventRequestSchema>;
