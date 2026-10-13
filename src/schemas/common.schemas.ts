import { z } from 'zod';
import { LOCALES } from '../domain/locale.js';
import { isTimeZone } from '../domain/time/local-date.js';
import { ERROR_CODES, ERROR_REASONS } from '../errors/app-error.js';

const errorDetailsSchema = z.looseObject({
  reason: z
    .enum(ERROR_REASONS)
    .optional()
    .describe('Why the request failed, where the code alone is too coarse to say'),
});

export const errorResponseSchema = z
  .object({
    code: z.enum(ERROR_CODES).describe('Stable machine-readable code, used by clients for i18n'),
    message: z.string().describe('Human-readable English description, for logs and debugging'),
    details: errorDetailsSchema.optional(),
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

export const localeSchema = z
  .enum(LOCALES)
  .describe('The language of the interface and of the content a new account starts with');

export const isoDateSchema = z.iso.date();
export const isoDateTimeSchema = z.iso.datetime();
