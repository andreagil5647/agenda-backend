import { z } from 'zod';

const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

// zod runs refinements even when the url check already failed, so the
// refinement must not assume a parseable URL.
const origin = z
  .url({ protocol: /^https?$/ })
  .refine((value) => URL.canParse(value) && new URL(value).origin === value, {
    message: 'must be a bare origin such as https://example.com (no path or trailing slash)',
  });

const originList = z
  .string()
  .transform((value) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  )
  .pipe(z.array(origin).min(1));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  MONGODB_URI: z
    .string()
    .regex(/^mongodb(\+srv)?:\/\//, 'must be a mongodb:// or mongodb+srv:// connection string'),
  MONGODB_DB_NAME: z
    .string()
    .regex(/^[\w-]{1,38}$/, 'must be 1-38 letters, digits, "_" or "-"')
    .default('agenda'),
  CORS_ORIGINS: originList.default(['http://localhost:3000']),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(1),
  RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(600),
  DEMO_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  DEMO_MAX_ACTIVE_USERS: z.coerce.number().int().positive().default(200),
  LOG_LEVEL: z.enum(LOG_LEVELS).default('info'),
  // Set automatically by Render on every deploy.
  RENDER_GIT_COMMIT: z.string().optional(),
});

export type LogLevel = (typeof LOG_LEVELS)[number];

export interface Config {
  env: 'development' | 'test' | 'production';
  port: number;
  version: string;
  mongo: {
    uri: string;
    dbName: string;
  };
  http: {
    corsOrigins: string[];
    trustProxyHops: number;
    rateLimit: { windowMs: number; max: number };
  };
  demo: {
    /** Demo sign-ins allowed per IP in one rate limit window. */
    rateLimitMax: number;
    /** Demo accounts that may exist at once; each lives for a day. */
    maxActiveUsers: number;
  };
  log: {
    level: LogLevel;
  };
}

export class ConfigError extends Error {
  constructor(details: string) {
    super(`Invalid environment configuration:\n${details}`);
    this.name = 'ConfigError';
  }
}

/**
 * Reads and validates configuration from environment variables.
 * Empty strings count as unset, so a blank variable in the hosting dashboard
 * falls back to its default instead of failing validation.
 * Error messages never include the offending values, which may be secrets.
 */
export function loadConfig(source: NodeJS.ProcessEnv = process.env): Config {
  const input = Object.fromEntries(
    Object.entries(source).filter(([, value]) => value !== undefined && value !== ''),
  );

  const result = envSchema.safeParse(input);
  if (!result.success) {
    throw new ConfigError(z.prettifyError(result.error));
  }

  const env = result.data;
  return {
    env: env.NODE_ENV,
    port: env.PORT,
    version: env.RENDER_GIT_COMMIT?.slice(0, 7) ?? 'dev',
    mongo: {
      uri: env.MONGODB_URI,
      dbName: env.MONGODB_DB_NAME,
    },
    http: {
      corsOrigins: env.CORS_ORIGINS,
      trustProxyHops: env.TRUST_PROXY_HOPS,
      rateLimit: { windowMs: env.RATE_LIMIT_WINDOW_MS, max: env.RATE_LIMIT_MAX },
    },
    demo: {
      rateLimitMax: env.DEMO_RATE_LIMIT_MAX,
      maxActiveUsers: env.DEMO_MAX_ACTIVE_USERS,
    },
    log: {
      level: env.LOG_LEVEL,
    },
  };
}
