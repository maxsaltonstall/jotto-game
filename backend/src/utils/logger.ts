/**
 * Structured logging utility using AWS Lambda Powertools
 * Provides consistent JSON logging with correlation IDs and context
 */

import { Logger } from '@aws-lambda-powertools/logger';

// Create logger instance with service name
const logger = new Logger({
  serviceName: 'jotto-game',
  logLevel: (process.env.LOG_LEVEL || 'INFO') as 'DEBUG' | 'INFO' | 'WARN' | 'ERROR',
  environment: process.env.DD_ENV || 'production',
});

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
 * Create a child logger with additional context
 */
export function createLogger(context: LogContext): Logger {
  return logger.createChild({
    persistentLogAttributes: context
  });
}

/**
 * Export the base logger for general use
 */
export { logger };
