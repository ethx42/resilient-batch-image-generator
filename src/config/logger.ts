/**
 * Pino Logger Configuration
 *
 * Provides structured logging throughout the application.
 * Uses pino-pretty in development for human-readable output.
 *
 * @module config/logger
 */

import pino from 'pino';

// =============================================================================
// Logger Types
// =============================================================================

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LoggerConfig {
  readonly level: LogLevel;
  readonly prettyPrint: boolean;
}

// =============================================================================
// Logger Factory
// =============================================================================

/**
 * Create a configured Pino logger instance.
 *
 * @param config - Logger configuration
 * @returns Configured Pino logger
 */
export function createLogger(config: LoggerConfig): pino.Logger {
  const options: pino.LoggerOptions = {
    level: config.level,
  };

  // Use pino-pretty transport in development
  if (config.prettyPrint) {
    return pino({
      ...options,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss',
          ignore: 'pid,hostname',
        },
      },
    });
  }

  // Plain JSON output for production
  return pino(options);
}

/**
 * Create a child logger with bound context.
 *
 * Child loggers inherit parent config but add contextual bindings.
 *
 * @example
 * ```typescript
 * const jobLogger = createChildLogger(logger, { jobId: 1, component: 'orchestrator' });
 * jobLogger.info('Processing started'); // Logs with jobId and component
 * ```
 */
export function createChildLogger(
  parent: pino.Logger,
  bindings: Record<string, unknown>,
): pino.Logger {
  return parent.child(bindings);
}

// =============================================================================
// Default Logger Instance
// =============================================================================

/**
 * Default logger for immediate use before config is loaded.
 * Uses info level with pretty printing.
 */
export const defaultLogger = createLogger({
  level: 'info',
  prettyPrint: process.env['NODE_ENV'] !== 'production',
});


