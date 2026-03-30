/**
 * Vienna OS Error Classes
 */
export declare class ViennaError extends Error {
    constructor(message: string);
}
export declare class AuthenticationError extends ViennaError {
    constructor(message?: string);
}
export declare class ValidationError extends ViennaError {
    constructor(message?: string);
}
export declare class NotFoundError extends ViennaError {
    constructor(message?: string);
}
export declare class RateLimitError extends ViennaError {
    constructor(message?: string);
}
