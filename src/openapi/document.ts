import { readFileSync } from 'node:fs';
import { OpenApiGeneratorV31, type OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

// Resolves to the repository root from both src/openapi and dist/openapi.
const { version } = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
) as { version: string };

export type OpenApiDocument = ReturnType<OpenApiGeneratorV31['generateDocument']>;

export function buildOpenApiDocument(registry: OpenAPIRegistry): OpenApiDocument {
  return new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'Agenda API',
      version,
      description:
        'REST API for Agenda: calendars, events, tasks and reminders.\n\n' +
        'Errors always use the `ErrorResponse` shape. Clients should branch on `code`, ' +
        'not on `message`.',
      license: { name: 'MIT', identifier: 'MIT' },
    },
    servers: [{ url: '/', description: 'Same origin as the web app' }],
  });
}
