import type { z } from 'zod';
import type { RouteResponse } from '../openapi/define-route.js';
import { errorResponseSchema } from '../schemas/common.schemas.js';

/** Error responses shared by the resource routers, so each is described once. */
export const unauthorized: RouteResponse = {
  description: 'Authentication required',
  schema: errorResponseSchema,
};

/** A single resource, sent with the ETag a later write has to send back. */
export function versioned(description: string, schema: z.ZodType): RouteResponse {
  return { description, schema, etag: true };
}

export const notFound: RouteResponse = {
  description: 'Resource not found',
  schema: errorResponseSchema,
};
