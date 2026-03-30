/**
 * Vienna OS Error Classes
 */

export class ViennaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ViennaError';
  }
}

export class AuthenticationError extends ViennaError {
  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends ViennaError {
  constructor(message: string = 'Validation error') {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends ViennaError {
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends ViennaError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
  }
}
