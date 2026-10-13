import type { z } from 'zod';
import { authUserSchema, userSettingsSchema } from './auth.schemas.js';
import { timeZoneSchema } from './common.schemas.js';

export const meResponseSchema = authUserSchema.meta({ id: 'MeResponse' });

export const patchSettingsRequestSchema = userSettingsSchema
  .extend({ timeZone: timeZoneSchema })
  .partial()
  .meta({ id: 'PatchSettingsRequest' });

export type PatchSettingsRequest = z.infer<typeof patchSettingsRequestSchema>;
