/**
 * Lambda handler: WebSocket $connect route
 * Stores connection information when a client connects
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { sendDistributionMetric } from 'datadog-lambda-js';
import { ConnectionRepository } from '../repositories/ConnectionRepository.js';
import { createLogger } from '../utils/logger.js';
import { wrapHandler } from '../utils/datadogWrapper.js';

const connectionRepository = new ConnectionRepository();

async function handlerImpl(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
  const logger = createLogger({ operation: 'ws-connect' });
  const connectionId = event.requestContext.connectionId;

  if (!connectionId) {
    logger.error('No connectionId in request context');
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }

  try {
    // Extract gameId and playerId from query string
    const queryParams = event.queryStringParameters || {};
    const gameId = queryParams.gameId;
    const playerId = queryParams.playerId;
    const playerName = queryParams.playerName || 'Anonymous';

    if (!gameId || !playerId) {
      logger.warn('Missing required parameters', {
        connectionId,
        gameId,
        playerId
      });

      return {
        statusCode: 403,
        body: JSON.stringify({ message: 'Missing gameId or playerId' })
      };
    }

    logger.info('WebSocket connection established', {
      connectionId,
      gameId,
      playerId,
      playerName
    });

    // Save connection to database
    await connectionRepository.saveConnection(connectionId, gameId, playerId, playerName);

    // Send metric to Datadog
    sendDistributionMetric('jotto.websocket.connected', 1, `game_id:${gameId}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Connected' })
    };
  } catch (err) {
    logger.error('Failed to handle WebSocket connect', {
      connectionId,
      error: (err as Error).message
    });

    sendDistributionMetric('jotto.websocket.connect.error', 1);

    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to connect' })
    };
  }
}

// Export wrapped handler for Datadog instrumentation
export const handler = wrapHandler(handlerImpl);
