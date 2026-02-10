/**
 * Lambda response utilities
 */

import type { APIGatewayProxyResult } from 'aws-lambda';
import { GameError } from './errors.js';
import { logger } from './logger.js';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

export function success<T>(data: T, statusCode: number = 200): APIGatewayProxyResult {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(data)
  };
}

export function error(err: Error | GameError, statusCode?: number): APIGatewayProxyResult {
  if (err instanceof GameError) {
    logger.warn('Game error', {
      error: err.code,
      message: err.message,
      statusCode: err.statusCode
    });

    return {
      statusCode: err.statusCode,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: err.code,
        message: err.message
      })
    };
  }

  logger.error('Unexpected error', {
    error: err.message,
    stack: err.stack
  });

  return {
    statusCode: statusCode || 500,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      error: 'INTERNAL_ERROR',
      message: err.message || 'An unexpected error occurred'
    })
  };
}

export function parseBody<T>(body: string | null): T {
  if (!body) {
    throw new GameError('Request body is required', 400, 'MISSING_BODY');
  }

  try {
    return JSON.parse(body) as T;
  } catch (err) {
    throw new GameError('Invalid JSON in request body', 400, 'INVALID_JSON');
  }
}
