import { z } from 'zod';
import { isTimeZone } from '../domain/time/local-date.js';
import { ERROR_CODES } from '../errors/app-error.js';

export const errorResponseSchema = z
  .object({
    code: z.enum(ERROR_CODES).describe('Stable machine-readable code, used by clients for i18n'),
    message: z.string().describe('Human-readable English description, for logs and debugging'),
    details: z.record(z.string(), z.unknown()).optional(),
    requestId: z.string().describe('Also returned in the X-Request-Id header'),
  })
  .meta({ id: 'ErrorResponse' });

export type ErrorResponseBody = z.infer<typeof errorResponseSchema>;

export const objectIdSchema = z.string().regex(/^[0-9a-f]{24}$/i);
export const objectIdParamSchema = z.object({ id: objectIdSchema });

export const timeZoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .refine(isTimeZone, { message: 'must be an IANA time zone such as Europe/Madrid' });

export const isoDateSchema = z.iso.date();
export const isoDateTimeSchema = z.iso.datetime();
