/**
 * Lambda handler: WebSocket $default route
 * Handles messages from clients (ping/pong, etc.)
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand
} from '@aws-sdk/client-apigatewaymanagementapi';
import { sendDistributionMetric } from 'datadog-lambda-js';
import { createLogger } from '../utils/logger.js';
import { wrapHandler } from '../utils/datadogWrapper.js';

const wsEndpoint = process.env.WEBSOCKET_API_ENDPOINT || '';
const client = wsEndpoint ? new ApiGatewayManagementApiClient({ endpoint: wsEndpoint }) : null;

async function handlerImpl(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
  const logger = createLogger({ operation: 'ws-message' });
  const connectionId = event.requestContext.connectionId;

  if (!connectionId) {
    logger.error('No connectionId in request context');
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const messageType = body.type || 'UNKNOWN';

    logger.info('Received WebSocket message', {
      connectionId,
      messageType
    });

    // Handle ping/pong
    if (messageType === 'PING' && client) {
      const pongMessage = {
        type: 'PONG',
        timestamp: new Date().toISOString()
      };

      const command = new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: Buffer.from(JSON.stringify(pongMessage))
      });

      await client.send(command);

      logger.debug('Sent PONG response', { connectionId });
      sendDistributionMetric('jotto.websocket.ping', 1);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Message received' })
    };
  } catch (err) {
    logger.error('Failed to handle WebSocket message', {
      connectionId,
      error: (err as Error).message
    });

    sendDistributionMetric('jotto.websocket.message.error', 1);

    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to process message' })
    };
  }
}

// Export wrapped handler for Datadog instrumentation
export const handler = wrapHandler(handlerImpl);
