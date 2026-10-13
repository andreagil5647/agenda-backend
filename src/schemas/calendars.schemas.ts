import { z } from 'zod';
import { isoDateTimeSchema, objectIdSchema } from './common.schemas.js';

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

// The fields a client can set, without defaults. A default belongs to creation
// only: on an update an absent field means "leave it alone", and zod would
// fill a defaulted field in, overwriting the stored value.
const calendarFields = {
  name: z.string().trim().min(1).max(80),
  colorKey: z.string().trim().min(1).max(32),
  visible: z.boolean(),
  defaultReminderMinutes: z.array(z.number().int().min(0).max(10_080)),
};

export const createCalendarRequestSchema = z
  .object({
    name: calendarFields.name,
    colorKey: calendarFields.colorKey.default('blue'),
    visible: calendarFields.visible.default(true),
    defaultReminderMinutes: calendarFields.defaultReminderMinutes.default([]),
  })
  .meta({ id: 'CreateCalendarRequest' });

export const patchCalendarRequestSchema = z.object(calendarFields).partial().meta({
  id: 'PatchCalendarRequest',
});

export const calendarOrderRequestSchema = z
  .object({
    calendarIds: z.array(objectIdSchema).min(1),
  })
  .meta({ id: 'CalendarOrderRequest' });

export type CreateCalendarRequest = z.infer<typeof createCalendarRequestSchema>;
export type PatchCalendarRequest = z.infer<typeof patchCalendarRequestSchema>;
export type CalendarOrderRequest = z.infer<typeof calendarOrderRequestSchema>;
