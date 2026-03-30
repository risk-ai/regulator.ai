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
const LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};
class Logger {
    service;
    minLevel;
    constructor(service = 'vienna-os', minLevel) {
        this.service = service;
        this.minLevel = (minLevel || process.env.LOG_LEVEL) || 'info';
    }
    log(level, message, meta) {
        if (LOG_LEVELS[level] < LOG_LEVELS[this.minLevel])
            return;
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            service: this.service,
            message,
            ...meta,
        };
        const output = JSON.stringify(entry);
        if (level === 'error') {
            process.stderr.write(output + '\n');
        }
        else {
            process.stdout.write(output + '\n');
        }
    }
    debug(message, meta) { this.log('debug', message, meta); }
    info(message, meta) { this.log('info', message, meta); }
    warn(message, meta) { this.log('warn', message, meta); }
    error(message, meta) { this.log('error', message, meta); }
    child(meta) {
        return new ChildLogger(this, meta);
    }
}
class ChildLogger {
    parent;
    meta;
    constructor(parent, meta) {
        this.parent = parent;
        this.meta = meta;
    }
    debug(message, extra) { this.parent.debug(message, { ...this.meta, ...extra }); }
    info(message, extra) { this.parent.info(message, { ...this.meta, ...extra }); }
    warn(message, extra) { this.parent.warn(message, { ...this.meta, ...extra }); }
    error(message, extra) { this.parent.error(message, { ...this.meta, ...extra }); }
}
export const logger = new Logger();
export { Logger };
//# sourceMappingURL=logger.js.map