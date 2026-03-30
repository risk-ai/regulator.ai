/**
 * Structured Logger — Vienna OS
 *
 * Zero-dependency JSON structured logger.
 * Replaces console.log/error/warn with structured output.
 *
 * Usage:
 *   import { logger } from './logger.js';
 *   logger.info('User logged in', { operator: 'jane', tenantId: 'prod' });
 *   logger.error('Intent failed', { action: 'restart_service', error: err.message });
 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';
declare class Logger {
    private service;
    private minLevel;
    constructor(service?: string, minLevel?: LogLevel);
    private log;
    debug(message: string, meta?: Record<string, unknown>): void;
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, meta?: Record<string, unknown>): void;
    child(meta: Record<string, unknown>): ChildLogger;
}
declare class ChildLogger {
    private parent;
    private meta;
    constructor(parent: Logger, meta: Record<string, unknown>);
    debug(message: string, extra?: Record<string, unknown>): void;
    info(message: string, extra?: Record<string, unknown>): void;
    warn(message: string, extra?: Record<string, unknown>): void;
    error(message: string, extra?: Record<string, unknown>): void;
}
export declare const logger: Logger;
export { Logger };
//# sourceMappingURL=logger.d.ts.map