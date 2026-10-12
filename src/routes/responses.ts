import type { RouteResponse } from '../openapi/define-route.js';
import { errorResponseSchema } from '../schemas/common.schemas.js';

/** Error responses shared by the resource routers, so each is described once. */
export const unauthorized: RouteResponse = {
  description: 'Authentication required',
  schema: errorResponseSchema,
};

export const notFound: RouteResponse = {
  description: 'Resource not found',
  schema: errorResponseSchema,
};
