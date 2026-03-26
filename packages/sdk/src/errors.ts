/**
 * Base error class for all Vienna SDK errors.
 * Extends native Error with HTTP status, error code, and optional details.
 */
export class ViennaError extends Error {
  /** Machine-readable error code from the API (e.g. `POLICY_VIOLATION`). */
  readonly code: string;
  /** HTTP status code. */
  readonly status: number;
  /** Additional error details from the API response. */
  readonly details?: unknown;

  constructor(message: string, status: number, code: string, details?: unknown) {
    super(message);
    this.name = 'ViennaError';
    this.status = status;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when the API key is missing or invalid (HTTP 401). */
export class ViennaAuthError extends ViennaError {
  constructor(message: string, code: string = 'UNAUTHORIZED', details?: unknown) {
    super(message, 401, code, details);
    this.name = 'ViennaAuthError';
  }
}

/** Thrown when the authenticated user lacks permission (HTTP 403). */
export class ViennaForbiddenError extends ViennaError {
  constructor(message: string, code: string = 'FORBIDDEN', details?: unknown) {
    super(message, 403, code, details);
    this.name = 'ViennaForbiddenError';
  }
}

/** Thrown when the requested resource does not exist (HTTP 404). */
export class ViennaNotFoundError extends ViennaError {
  constructor(message: string, code: string = 'NOT_FOUND', details?: unknown) {
    super(message, 404, code, details);
    this.name = 'ViennaNotFoundError';
  }
}

/** Thrown when the rate limit is exceeded (HTTP 429). */
export class ViennaRateLimitError extends ViennaError {
  /** Seconds to wait before retrying. */
  readonly retryAfter: number;

  constructor(message: string, retryAfter: number, code: string = 'RATE_LIMITED', details?: unknown) {
    super(message, 429, code, details);
    this.name = 'ViennaRateLimitError';
    this.retryAfter = retryAfter;
  }
}

/** Thrown when request validation fails (HTTP 400). */
export class ViennaValidationError extends ViennaError {
  /** Field-level validation errors. */
  readonly fields?: Record<string, string>;

  constructor(message: string, code: string = 'VALIDATION_ERROR', fields?: Record<string, string>, details?: unknown) {
    super(message, 400, code, details);
    this.name = 'ViennaValidationError';
    this.fields = fields;
  }
}

/** Thrown on server-side errors (HTTP 5xx). */
export class ViennaServerError extends ViennaError {
  constructor(message: string, status: number = 500, code: string = 'SERVER_ERROR', details?: unknown) {
    super(message, status, code, details);
    this.name = 'ViennaServerError';
  }
}
