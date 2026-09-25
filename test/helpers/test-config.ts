import { pino } from 'pino';
import { loadConfig, type Config } from '../../src/config/env.js';

export function createTestConfig(env: NodeJS.ProcessEnv = {}): Config {
  return loadConfig({
    NODE_ENV: 'test',
    MONGODB_URI: 'mongodb://127.0.0.1:27017',
    LOG_LEVEL: 'silent',
    CORS_ORIGINS: 'http://localhost:3000',
    ...env,
  });
}

export const silentLogger = pino({ level: 'silent' });
