/**
 * Lambda handler: WebSocket $disconnect route
 * Cleans up connection information when a client disconnects
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { ConnectionRepository } from '../repositories/ConnectionRepository.js';
import { createLogger } from '../utils/logger.js';
const connectionRepository = new ConnectionRepository();

export async function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
  const logger = createLogger({ operation: 'ws-disconnect' });
  const connectionId = event.requestContext.connectionId;

  if (!connectionId) {
    logger.error('No connectionId in request context');
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }

  try {
    logger.info('WebSocket connection closed', { connectionId });

    // Delete connection from database
    await connectionRepository.deleteConnection(connectionId);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Disconnected' })
    };
  } catch (err) {
    logger.error('Failed to handle WebSocket disconnect', {
      connectionId,
      error: (err as Error).message
    });

    // Return 200 even on error - connection is already closed
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Disconnected' })
    };
  }
}

// Note: Datadog wrapper removed from WebSocket handlers - incompatible with API Gateway WebSocket
