/**
 * Structured logging utility
 * Provides consistent JSON logging with context
 * Note: Temporarily using console.log until Lambda Powertools bundling is configured
 */

/**
 * Log context interface for game-specific information
 */
export interface LogContext {
  gameId?: string;
  playerId?: string;
  userId?: string;
  operation?: string;
  duration?: number;
  [key: string]: any;
}

/**
 * Simple logger implementation
 */
class SimpleLogger {
  private context: LogContext = {};

  constructor(context?: LogContext) {
    this.context = context || {};
  }

  info(message: string, additionalContext?: any) {
    console.log(JSON.stringify({
      level: 'INFO',
      message,
      ...this.context,
      ...additionalContext,
      timestamp: new Date().toISOString()
    }));
  }

  error(message: string, error?: any, additionalContext?: any) {
    console.error(JSON.stringify({
      level: 'ERROR',
      message,
      error: error?.message || error,
      stack: error?.stack,
      ...this.context,
      ...additionalContext,
      timestamp: new Date().toISOString()
    }));
  }

  warn(message: string, additionalContext?: any) {
    console.warn(JSON.stringify({
      level: 'WARN',
      message,
      ...this.context,
      ...additionalContext,
      timestamp: new Date().toISOString()
    }));
  }

  debug(message: string, additionalContext?: any) {
    if (process.env.LOG_LEVEL === 'DEBUG') {
      console.log(JSON.stringify({
        level: 'DEBUG',
        message,
        ...this.context,
        ...additionalContext,
        timestamp: new Date().toISOString()
      }));
    }
  }

  createChild(options: { persistentLogAttributes: LogContext }): SimpleLogger {
    return new SimpleLogger({ ...this.context, ...options.persistentLogAttributes });
  }
}

// Create logger instance
const logger = new SimpleLogger({
  serviceName: 'jotto-game',
  environment: process.env.DD_ENV || 'production',
});

/**
 * Create a child logger with additional context
 */
export function createLogger(context: LogContext): SimpleLogger {
  return logger.createChild({
    persistentLogAttributes: context
  });
}

/**
 * Export the base logger for general use
 */
export { logger };
