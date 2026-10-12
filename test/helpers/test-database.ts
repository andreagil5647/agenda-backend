import { randomUUID } from 'node:crypto';
import { inject } from 'vitest';
import { connectToDatabase, type Database } from '../../src/db/mongo.js';
import { silentLogger } from './test-config.js';

export interface TestDatabase extends Database {
  /** Drops the database and closes the connection. */
  dispose: () => Promise<void>;
}

export async function createTestDatabase(): Promise<TestDatabase> {
  const database = await connectToDatabase(
    { uri: inject('mongoUri'), dbName: `test_${randomUUID().slice(0, 8)}` },
    silentLogger,
  );

  return {
    ...database,
    dispose: async () => {
      await database.db.dropDatabase();
      await database.close();
    },
  };
}
