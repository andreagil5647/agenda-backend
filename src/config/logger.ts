import { pino, type DestinationStream, type Logger } from 'pino';
import type { Config } from './env.js';

export const REDACTED_PATHS = [
  'req.headers.cookie',
  'req.headers.authorization',
  'req.headers["x-csrf-token"]',
  'res.headers["set-cookie"]',
  '*.password',
  '*.passwordHash',
];

/**
 * JSON logs in production (parsed by the hosting log viewer), pretty logs in
 * development. Credentials and session cookies are always redacted.
 */
export function createLogger(
  config: Pick<Config, 'env' | 'log'>,
  destination?: DestinationStream,
): Logger {
  const options = {
    level: config.log.level,
    redact: { paths: REDACTED_PATHS, censor: '[redacted]' },
  };

  if (config.env === 'development' && !destination) {
    return pino({
      ...options,
      transport: {
        target: 'pino-pretty',
        options: { translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
      },
    });
  }

  return destination ? pino(options, destination) : pino(options);
}
