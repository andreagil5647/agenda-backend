import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError, NotFoundError } from '../errors/app-error.js';
import type { ErrorResponseBody } from '../schemas/common.schemas.js';

interface BodyParserError {
  type: string;
  status: number;
}

function isBodyParserError(error: unknown): error is BodyParserError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    typeof error.type === 'string' &&
    'status' in error &&
    typeof error.status === 'number'
  );
}

/**
 * Normalises anything thrown by a route into an AppError. Unknown errors
 * become a generic 500 so internal messages never reach the client.
 */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof ZodError) {
    return new AppError(422, 'VALIDATION_ERROR', 'Request validation failed', {
      issues: error.issues.map(({ path, code, message }) => ({
        path: path.join('.'),
        code,
        message,
      })),
    });
  }

  if (isBodyParserError(error)) {
    if (error.type === 'entity.too.large') {
      return new AppError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
    }
    if (error.type === 'entity.parse.failed') {
      return new AppError(400, 'BAD_REQUEST', 'Request body is not valid JSON');
    }
    if (error.status >= 400 && error.status < 500) {
      return new AppError(400, 'BAD_REQUEST', 'Request body could not be read');
    }
  }

  return new AppError(500, 'INTERNAL_ERROR', 'Something went wrong on our side');
}

export const notFoundHandler: RequestHandler = (req) => {
  throw new NotFoundError(`Route ${req.method} ${req.path}`);
};

export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const appError = toAppError(error);

  // pino-http logs the response once it finishes; attaching the original
  // error puts the stack trace in that same log line.
  if (appError.status >= 500) {
    res.err = error instanceof Error ? error : new Error(String(error));
  }

  const body: ErrorResponseBody = {
    code: appError.code,
    message: appError.message,
    ...(appError.details ? { details: appError.details } : {}),
    requestId: typeof req.id === 'string' || typeof req.id === 'number' ? String(req.id) : '',
  };

  res.status(appError.status).json(body);
};
