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

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private service: string;
  private minLevel: LogLevel;

  constructor(service: string = 'vienna-os', minLevel?: LogLevel) {
    this.service = service;
    this.minLevel = (minLevel || process.env.LOG_LEVEL as LogLevel) || 'info';
  }

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
    if (LOG_LEVELS[level] < LOG_LEVELS[this.minLevel]) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      message,
      ...meta,
    };

    const output = JSON.stringify(entry);

    if (level === 'error') {
      process.stderr.write(output + '\n');
    } else {
      process.stdout.write(output + '\n');
    }
  }

  debug(message: string, meta?: Record<string, unknown>) { this.log('debug', message, meta); }
  info(message: string, meta?: Record<string, unknown>) { this.log('info', message, meta); }
  warn(message: string, meta?: Record<string, unknown>) { this.log('warn', message, meta); }
  error(message: string, meta?: Record<string, unknown>) { this.log('error', message, meta); }

  child(meta: Record<string, unknown>): ChildLogger {
    return new ChildLogger(this, meta);
  }
}

class ChildLogger {
  private parent: Logger;
  private meta: Record<string, unknown>;

  constructor(parent: Logger, meta: Record<string, unknown>) {
    this.parent = parent;
    this.meta = meta;
  }

  debug(message: string, extra?: Record<string, unknown>) { this.parent.debug(message, { ...this.meta, ...extra }); }
  info(message: string, extra?: Record<string, unknown>) { this.parent.info(message, { ...this.meta, ...extra }); }
  warn(message: string, extra?: Record<string, unknown>) { this.parent.warn(message, { ...this.meta, ...extra }); }
  error(message: string, extra?: Record<string, unknown>) { this.parent.error(message, { ...this.meta, ...extra }); }
}

export const logger = new Logger();
export { Logger };
