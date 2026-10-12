import type { OpenAPIRegistry, ResponseConfig, RouteConfig } from '@asteasolutions/zod-to-openapi';
import { Router, type Request, type Response } from 'express';
import type { z } from 'zod';
import { errorResponseSchema } from '../schemas/common.schemas.js';

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';
type ObjectSchema = z.ZodObject;
type Output<S> = S extends z.ZodType ? z.output<S> : undefined;

export interface RouteResponse {
  description: string;
  schema?: z.ZodType;
}

export interface RouteDefinition<
  P extends ObjectSchema | undefined,
  Q extends ObjectSchema | undefined,
  B extends z.ZodType | undefined,
> {
  method: HttpMethod;
  /** Express-style path relative to the router, e.g. "/:id". */
  path: string;
  operationId: string;
  summary: string;
  description?: string;
  tags: string[];
  request?: { params?: P; query?: Q; body?: B };
  responses: Record<number, RouteResponse>;
  handler: (
    input: { params: Output<P>; query: Output<Q>; body: Output<B> },
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
  >(
    definition: RouteDefinition<P, Q, B>,
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
  validatesInput: boolean,
): Record<string, ResponseConfig> {
  const result: Record<string, ResponseConfig> = {};

  for (const [status, { description, schema }] of Object.entries(responses)) {
    result[status] = schema
      ? { description, content: { 'application/json': { schema } } }
      : { description };
  }

  if (validatesInput) {
    result['422'] ??= errorResponse('The request did not pass validation');
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

    const request: NonNullable<RouteConfig['request']> = {};
    if (params) request.params = params;
    if (query) request.query = query;
    if (body) {
      request.body = { required: true, content: { 'application/json': { schema: body } } };
    }

    registry.registerPath({
      method: definition.method,
      path: toOpenApiPath(mountPath + definition.path),
      operationId: definition.operationId,
      summary: definition.summary,
      ...(definition.description ? { description: definition.description } : {}),
      tags: definition.tags,
      request,
      responses: buildResponses(definition.responses, Boolean(params ?? query ?? body)),
    });

    router[definition.method](definition.path, async (req, res) => {
      const input = {
        params: params?.parse(req.params),
        query: query?.parse(req.query),
        body: body?.parse(req.body),
      } as Parameters<typeof definition.handler>[0];

      await definition.handler(input, req, res);
    });
  };

  return { router, route };
}
