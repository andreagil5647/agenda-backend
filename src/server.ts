import { existsSync } from 'node:fs';
import { createApp } from './app.js';
import { ConfigError, loadConfig, type Config } from './config/env.js';
import { createLogger } from './config/logger.js';
import { connectToDatabase, type Database } from './db/mongo.js';

const SHUTDOWN_TIMEOUT_MS = 10_000;

// Local development reads a .env file; on Render variables come from the dashboard.
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

let config: Config;
try {
  config = loadConfig();
} catch (error) {
  if (error instanceof ConfigError) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
  throw error;
}

const logger = createLogger(config);

let database: Database;
try {
  database = await connectToDatabase(config.mongo, logger);
} catch (error) {
  logger.fatal({ err: error }, 'Could not connect to MongoDB');
  process.exit(1);
}

const { app } = createApp({ config, logger, db: database.db });

const server = app.listen(config.port, (error) => {
  if (error) {
    logger.fatal({ err: error }, 'Could not start the HTTP server');
    process.exit(1);
  }
  logger.info({ port: config.port, env: config.env, version: config.version }, 'API listening');
});

function shutdown(signal: NodeJS.Signals): void {
  logger.info({ signal }, 'Shutting down');

  setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();

  server.close(() => {
    database.close().then(
      () => process.exit(0),
      (error: unknown) => {
        logger.error({ err: error }, 'Error while closing the database connection');
        process.exit(1);
      },
    );
  });
}

process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
