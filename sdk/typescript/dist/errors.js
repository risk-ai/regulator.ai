"use strict";
/**
 * Vienna OS Error Classes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitError = exports.NotFoundError = exports.ValidationError = exports.AuthenticationError = exports.ViennaError = void 0;
class ViennaError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ViennaError';
    }
}
exports.ViennaError = ViennaError;
class AuthenticationError extends ViennaError {
    constructor(message = 'Authentication failed') {
        super(message);
        this.name = 'AuthenticationError';
    }
}
exports.AuthenticationError = AuthenticationError;
class ValidationError extends ViennaError {
    constructor(message = 'Validation error') {
        super(message);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class NotFoundError extends ViennaError {
    constructor(message = 'Resource not found') {
        super(message);
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
class RateLimitError extends ViennaError {
    constructor(message = 'Rate limit exceeded') {
        super(message);
        this.name = 'RateLimitError';
    }
}
exports.RateLimitError = RateLimitError;
