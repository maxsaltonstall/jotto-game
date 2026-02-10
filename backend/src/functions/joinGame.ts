/**
 * Lambda handler: Join an existing game
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { sendDistributionMetric } from 'datadog-lambda-js';
import { GameService } from '../services/GameService.js';
import { success, error, parseBody } from '../utils/response.js';
import type { JoinGameRequest } from '../models/types.js';

const gameService = new GameService();

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
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
