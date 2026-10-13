import { z } from 'zod';
import { localeSchema, timeZoneSchema } from './common.schemas.js';

export const passwordSchema = z
  .string()
  .min(8)
  .max(128)
  .describe('Plain-text password, accepted only in register/login requests');

export const registerRequestSchema = z
  .object({
    email: z.email().max(320),
    password: passwordSchema,
    displayName: z.string().trim().min(1).max(80),
    timeZone: timeZoneSchema
      .optional()
      .describe('IANA zone the account starts in, usually the browser zone. Defaults to UTC'),
    locale: localeSchema
      .optional()
      .describe('Language the account starts in, usually the browser language. Defaults to en'),
  })
  .meta({ id: 'RegisterRequest' });

export const demoRequestSchema = z
  .object({
    timeZone: timeZoneSchema
      .optional()
      .describe('IANA zone the demo day is laid out in. Defaults to UTC'),
    locale: localeSchema
      .optional()
      .describe(
        'Language the demo day is written in, usually the browser language. Defaults to en',
      ),
  })
  .default({})
  .meta({ id: 'DemoRequest' });

export const loginRequestSchema = z
  .object({
    email: z.email().max(320),
    password: passwordSchema,
  })
  .meta({ id: 'LoginRequest' });

export const userSettingsSchema = z
  .object({
    timeZone: z.string(),
    weekStartsOn: z.union([z.literal(0), z.literal(1), z.literal(6)]),
    hourCycle: z.enum(['h12', 'h23']),
    locale: localeSchema,
    theme: z.enum(['system', 'light', 'dark']),
    accentColor: z.string(),
  })
  .meta({ id: 'UserSettings' });

export const authUserSchema = z
  .object({
    id: z.string(),
    email: z.email(),
    displayName: z.string(),
    settings: userSettingsSchema,
    isDemo: z.boolean(),
  })
  .meta({ id: 'AuthUser' });

export const authenticatedSessionSchema = z
  .object({
    user: authUserSchema,
    expiresAt: z.iso.datetime(),
    csrfToken: z.string(),
  })
  .meta({ id: 'AuthenticatedSession' });

export const anonymousSessionSchema = z
  .object({
    user: z.null(),
  })
  .meta({ id: 'AnonymousSession' });

export const sessionResponseSchema = z
  .union([authenticatedSessionSchema, anonymousSessionSchema])
  .meta({
    id: 'SessionResponse',
  });

export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type DemoRequest = z.infer<typeof demoRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type UserSettingsResponse = z.infer<typeof userSettingsSchema>;
export type AuthUserResponse = z.infer<typeof authUserSchema>;
export type AuthenticatedSessionResponse = z.infer<typeof authenticatedSessionSchema>;
export type SessionResponse = z.infer<typeof sessionResponseSchema>;
