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

export type PatchSettingsRequest = z.infer<typeof patchSettingsRequestSchema>;
export type CreateCalendarRequest = z.infer<typeof createCalendarRequestSchema>;
export type PatchCalendarRequest = z.infer<typeof patchCalendarRequestSchema>;
export type CalendarOrderRequest = z.infer<typeof calendarOrderRequestSchema>;
