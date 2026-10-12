import { MongoMemoryReplSet } from 'mongodb-memory-server';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    mongoUri: string;
  }
}

/**
 * Starts one real mongod (single-node replica set, so transactions work like
 * on Atlas) for the whole integration run. Each test file gets its own
 * database, so files can run in parallel without seeing each other's data.
 */
export default async function setup(project: TestProject) {
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  project.provide('mongoUri', replSet.getUri());

  return async () => {
    await replSet.stop();
  };
}
