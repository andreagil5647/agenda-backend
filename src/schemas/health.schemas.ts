import { z } from 'zod';

export const livenessSchema = z
  .object({
    status: z.literal('ok'),
    version: z.string().describe('Short commit hash of the deployed build, or "dev"'),
    uptimeSeconds: z.number().int().nonnegative(),
  })
  .meta({ id: 'Liveness' });

export const readinessSchema = z
  .object({
    status: z.enum(['ok', 'unavailable']),
    checks: z.object({
      database: z.enum(['up', 'down']),
    }),
  })
  .meta({ id: 'Readiness' });

export type Liveness = z.infer<typeof livenessSchema>;
export type Readiness = z.infer<typeof readinessSchema>;
