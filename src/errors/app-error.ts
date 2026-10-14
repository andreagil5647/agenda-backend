/**
 * Stable, machine-readable error codes. Clients map them to translated
 * messages, so renaming one is a breaking API change.
 */
export const ERROR_CODES = [
  'BAD_REQUEST',
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'PRECONDITION_FAILED',
  'PRECONDITION_REQUIRED',
  'PAYLOAD_TOO_LARGE',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/**
 * Why a request failed, where the code alone is too coarse to tell a client
 * what to say (a CONFLICT can be a taken email, a RATE_LIMITED a full demo).
 * Sent as `details.reason`; like the codes, these are part of the contract.
 */
export const ERROR_REASONS = [
  'stale_version',
  'email_taken',
  'demo_full',
  'end_not_after_start',
  'fields_of_other_kind',
] as const;

export type ErrorReason = (typeof ERROR_REASONS)[number];

export type ErrorDetails = { reason?: ErrorReason } & Record<string, unknown>;

export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly details?: ErrorDetails,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details?: ErrorDetails) {
    super(400, 'BAD_REQUEST', message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Not allowed') {
    super(403, 'FORBIDDEN', message);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(404, 'NOT_FOUND', `${resource} not found`);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super(409, 'CONFLICT', message, details);
  }
}

/** The resource is no longer at the version the client based its change on. */
export class PreconditionFailedError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super(412, 'PRECONDITION_FAILED', message, details);
  }
}

/** The request must say which version of the resource it expects to change. */
export class PreconditionRequiredError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super(428, 'PRECONDITION_REQUIRED', message, details);
  }
}

export class RateLimitedError extends AppError {
  constructor(message = 'Too many requests, please try again later', details?: ErrorDetails) {
    super(429, 'RATE_LIMITED', message, details);
  }
}
