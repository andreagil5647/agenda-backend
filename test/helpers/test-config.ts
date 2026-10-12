import { MongoClient, type Db } from 'mongodb';
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

/**
 * A Db handle pointing at a port where nothing listens. The driver connects
 * lazily, so it costs nothing until a test runs a query, which then fails fast.
 */
export function createUnreachableDb(): Db {
  return new MongoClient('mongodb://127.0.0.1:9', { serverSelectionTimeoutMS: 200 }).db('unused');
}
