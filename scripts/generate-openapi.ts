/**
 * Writes the OpenAPI document to openapi/openapi.json.
 * With --check, fails instead if the committed file is out of date, so CI
 * catches route changes that were not followed by a regenerated contract.
 *
 * The web app generates its API types from this committed file.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { MongoClient } from 'mongodb';
import { pino } from 'pino';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config/env.js';

const OUTPUT = new URL('../openapi/openapi.json', import.meta.url);

// The driver connects lazily and no request is served, so nothing connects.
const db = new MongoClient('mongodb://127.0.0.1:27017').db('openapi');
const { openApiDocument } = createApp({
  config: loadConfig({ NODE_ENV: 'test', MONGODB_URI: 'mongodb://127.0.0.1:27017' }),
  logger: pino({ level: 'silent' }),
  db,
});

const generated = `${JSON.stringify(openApiDocument, null, 2)}\n`;

if (process.argv.includes('--check')) {
  let committed = '';
  try {
    committed = readFileSync(OUTPUT, 'utf8');
  } catch {
    // Missing file is reported as out of date below.
  }
  if (committed !== generated) {
    process.stderr.write(
      'openapi/openapi.json is out of date. Run `npm run openapi:generate` and commit the result.\n',
    );
    process.exit(1);
  }
  process.stdout.write('openapi/openapi.json is up to date.\n');
} else {
  mkdirSync(new URL('.', OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, generated);
  process.stdout.write('Wrote openapi/openapi.json\n');
}
