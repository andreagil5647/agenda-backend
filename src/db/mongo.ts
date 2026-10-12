import { MongoClient, type Db } from 'mongodb';
import type { Logger } from 'pino';
import { ensureDatabaseIndexes } from './indexes.js';

export interface Database {
  client: MongoClient;
  db: Db;
  close: () => Promise<void>;
}

export async function connectToDatabase(
  options: { uri: string; dbName: string },
  logger: Logger,
): Promise<Database> {
  const client = new MongoClient(options.uri, {
    appName: 'agenda-backend',
    // The free Atlas tier caps connections per cluster; one small pool is plenty.
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10_000,
  });

  await client.connect();
  const db = client.db(options.dbName);
  await db.command({ ping: 1 });
  await ensureDatabaseIndexes(db);
  logger.info({ dbName: options.dbName }, 'Connected to MongoDB');

  return {
    client,
    db,
    close: () => client.close(),
  };
}
