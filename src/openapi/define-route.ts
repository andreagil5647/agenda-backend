import type { OpenAPIRegistry, ResponseConfig, RouteConfig } from '@asteasolutions/zod-to-openapi';
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { requireIfMatchVersion } from '../http/etag.js';
import { errorResponseSchema } from '../schemas/common.schemas.js';

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';
type ObjectSchema = z.ZodObject;
type Output<S> = S extends z.ZodType ? z.output<S> : undefined;
type ExpectedVersion<C> = C extends true ? number : undefined;

const IF_MATCH_HEADER = 'If-Match';

const ifMatchHeaderSchema = z.object({
  [IF_MATCH_HEADER]: z
    .string()
    .describe('The ETag of the version being changed, as last sent by the API, such as "3"'),
});

const etagHeaderSchema = z.object({
  ETag: z.string().describe('The version of the returned resource, to send back in If-Match'),
});

export interface RouteResponse {
  description: string;
  schema?: z.ZodType;
  /** The response carries the resource version in an ETag header. */
  etag?: boolean;
}

export interface RouteDefinition<
  P extends ObjectSchema | undefined,
  Q extends ObjectSchema | undefined,
  B extends z.ZodType | undefined,
  C extends boolean,
> {
  method: HttpMethod;
  /** Express-style path relative to the router, e.g. "/:id". */
  path: string;
  operationId: string;
  summary: string;
  description?: string;
  tags: string[];
  request?: { params?: P; query?: Q; body?: B };
  /**
   * The write changes an existing resource, so it must carry If-Match with
   * the version it was based on. The handler receives that version.
   */
  conditional?: C;
  responses: Record<number, RouteResponse>;
  handler: (
    input: {
      params: Output<P>;
      query: Output<Q>;
      body: Output<B>;
      expectedVersion: ExpectedVersion<C>;
    },
    req: Request,
    res: Response,
  ) => unknown;
}

export interface RouteBuilder {
  router: Router;
  route: <
    P extends ObjectSchema | undefined = undefined,
    Q extends ObjectSchema | undefined = undefined,
    B extends z.ZodType | undefined = undefined,
    C extends boolean = false,
  >(
    definition: RouteDefinition<P, Q, B, C>,
  ) => void;
}

/** Converts an Express path ("/events/:id/") to an OpenAPI path ("/events/{id}"). */
export function toOpenApiPath(path: string): string {
  const converted = path.replace(/:(\w+)/g, '{$1}').replace(/\/+$/, '');
  return converted === '' ? '/' : converted;
}

function errorResponse(description: string): ResponseConfig {
  return { description, content: { 'application/json': { schema: errorResponseSchema } } };
}

function buildResponses(
  responses: Record<number, RouteResponse>,
  { validatesInput, conditional }: { validatesInput: boolean; conditional: boolean },
): Record<string, ResponseConfig> {
  const result: Record<string, ResponseConfig> = {};

  for (const [status, { description, schema, etag }] of Object.entries(responses)) {
    result[status] = {
      description,
      ...(etag ? { headers: etagHeaderSchema } : {}),
      ...(schema ? { content: { 'application/json': { schema } } } : {}),
    };
  }

  if (validatesInput) {
    result['422'] ??= errorResponse('The request did not pass validation');
  }
  if (conditional) {
    result['412'] ??= errorResponse('The resource changed since the version in If-Match');
    result['428'] ??= errorResponse('The If-Match header is missing');
  }
  result['500'] ??= errorResponse('Unexpected server error');

  return result;
}

/**
 * Declares routes once: the same zod schemas validate the incoming request
 * and describe the endpoint in the OpenAPI document, so the published
 * contract cannot drift from what the server accepts.
 *
 * @param mountPath full path where the returned router is mounted, used for the docs
 */
export function createRouteBuilder(registry: OpenAPIRegistry, mountPath: string): RouteBuilder {
  const router = Router();

  const route: RouteBuilder['route'] = (definition) => {
    const { params, query, body } = definition.request ?? {};
    const conditional = definition.conditional === true;

    const request: NonNullable<RouteConfig['request']> = {};
    if (params) request.params = params;
    if (query) request.query = query;
    if (body) {
      request.body = { required: true, content: { 'application/json': { schema: body } } };
    }
    if (conditional) request.headers = ifMatchHeaderSchema;

    registry.registerPath({
      method: definition.method,
      path: toOpenApiPath(mountPath + definition.path),
      operationId: definition.operationId,
      summary: definition.summary,
      ...(definition.description ? { description: definition.description } : {}),
      tags: definition.tags,
      request,
      responses: buildResponses(definition.responses, {
        validatesInput: Boolean(params ?? query ?? body),
        conditional,
      }),
    });

    router[definition.method](definition.path, async (req, res) => {
      const input = {
        params: params?.parse(req.params),
        query: query?.parse(req.query),
        body: body?.parse(req.body),
        expectedVersion: conditional ? requireIfMatchVersion(req.get(IF_MATCH_HEADER)) : undefined,
      } as Parameters<typeof definition.handler>[0];

      await definition.handler(input, req, res);
    });
  };

  return { router, route };
}
