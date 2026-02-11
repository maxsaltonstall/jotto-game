/**
 * Lambda handler: Join an existing game
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { sendDistributionMetric } from 'datadog-lambda-js';
import { GameService } from '../services/GameService.js';
import { WebSocketService } from '../services/WebSocketService.js';
import { success, error, parseBody } from '../utils/response.js';
import type { JoinGameRequest } from '../models/types.js';
import { wrapHandler } from '../utils/datadogWrapper.js';

// Initialize services with WebSocket support
const wsEndpoint = process.env.WEBSOCKET_API_ENDPOINT;
const webSocketService = wsEndpoint ? new WebSocketService(wsEndpoint) : undefined;
const gameService = new GameService(undefined, undefined, webSocketService);

async function handlerImpl(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
  try {
    const gameId = event.pathParameters?.gameId;
    if (!gameId) {
      return error(new Error('Game ID is required'), 400);
    }

    const request = parseBody<JoinGameRequest>(event.body);

    const game = await gameService.joinGame(gameId, request.playerId, request.playerName, request.secretWord, request.userId);

    // Send custom metric to Datadog
    sendDistributionMetric('jotto.game.joined', 1, 'game_id:' + gameId);

    return success({ game });
  } catch (err) {
    // Track errors in Datadog
    sendDistributionMetric('jotto.game.join.error', 1);
    return error(err as Error);
  }
}

// Export wrapped handler for Datadog instrumentation
export const handler = wrapHandler(handlerImpl);
