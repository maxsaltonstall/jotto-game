/**
 * Lambda handler: WebSocket $connect route
 * Stores connection information when a client connects
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import { ConnectionRepository } from '../repositories/ConnectionRepository.js';
import { createLogger } from '../utils/logger.js';
// import { MetricsService } from '../utils/metrics.js'; // Temporarily disabled due to workspace dependency issues

const connectionRepository = new ConnectionRepository();
const wsEndpoint = process.env.WEBSOCKET_API_ENDPOINT || '';
const apiGatewayClient = wsEndpoint ? new ApiGatewayManagementApiClient({ endpoint: wsEndpoint }) : null;

export async function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
  const logger = createLogger({ operation: 'ws-connect' });
  const connectionId = event.requestContext.connectionId;

  if (!connectionId) {
    logger.error('No connectionId in request context');
    return {
      statusCode: 500,
      body: ''
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
        body: ''
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

    // Track WebSocket connection metrics (temporarily disabled)
    // try {
    //   const connections = await connectionRepository.getConnectionsByGameId(gameId);
    //   MetricsService.trackWebSocketConnections(connections.length);
    // } catch (err) {
    //   logger.warn('Failed to track WebSocket metrics', {
    //     connectionId,
    //     error: (err as Error).message
    //   });
    // }

    // Note: Cannot send messages from $connect handler - connection isn't fully established until handler returns
    // The frontend's onopen event will fire when the connection is ready

    return {
      statusCode: 200,
      body: ''
    };
  } catch (err) {
    logger.error('Failed to handle WebSocket connect', {
      connectionId,
      error: (err as Error).message
    });

    // Track WebSocket connection errors (temporarily disabled)
    // MetricsService.trackError('websocket_connect_error', (err as Error).message, {
    //   connectionId
    // });

    return {
      statusCode: 500,
      body: ''
    };
  }
}

// Note: Datadog wrapper removed from WebSocket handlers - incompatible with API Gateway WebSocket
