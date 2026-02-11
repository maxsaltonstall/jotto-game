/**
 * Lambda handler: WebSocket $disconnect route
 * Cleans up connection information when a client disconnects
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { sendDistributionMetric } from 'datadog-lambda-js';
import { ConnectionRepository } from '../repositories/ConnectionRepository.js';
import { createLogger } from '../utils/logger.js';
import { wrapHandler } from '../utils/datadogWrapper.js';

const connectionRepository = new ConnectionRepository();

async function handlerImpl(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
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

    // Send metric to Datadog
    sendDistributionMetric('jotto.websocket.disconnected', 1);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Disconnected' })
    };
  } catch (err) {
    logger.error('Failed to handle WebSocket disconnect', {
      connectionId,
      error: (err as Error).message
    });

    sendDistributionMetric('jotto.websocket.disconnect.error', 1);

    // Return 200 even on error - connection is already closed
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Disconnected' })
    };
  }
}

// Export wrapped handler for Datadog instrumentation
export const handler = wrapHandler(handlerImpl);
