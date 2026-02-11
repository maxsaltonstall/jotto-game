/**
 * Lambda handler: Create a new game
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { sendDistributionMetric } from 'datadog-lambda-js';
import { GameService } from '../services/GameService.js';
import { success, error, parseBody } from '../utils/response.js';
import type { CreateGameRequest } from '../models/types.js';
import { createLogger } from '../utils/logger.js';
import { wrapHandler } from '../utils/datadogWrapper.js';

const gameService = new GameService();

async function handlerImpl(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
  const startTime = Date.now();
  const logger = createLogger({ operation: 'createGame' });

  try {
    const request = parseBody<CreateGameRequest>(event.body);

    logger.info('Creating game', {
      playerId: request.playerId,
      playerName: request.playerName,
      userId: request.userId
    });

    const game = await gameService.createGame(request.playerId, request.playerName, request.secretWord, request.userId);

    const duration = Date.now() - startTime;
    logger.info('Game created successfully', {
      gameId: game.gameId,
      duration
    });

    // Send custom metric to Datadog
    sendDistributionMetric('jotto.game.created', 1, 'game_id:' + game.gameId);

    return success({ game }, 201);
  } catch (err) {
    const duration = Date.now() - startTime;
    logger.error('Failed to create game', {
      duration,
      error: (err as Error).message
    });

    // Track errors in Datadog
    sendDistributionMetric('jotto.game.create.error', 1);
    return error(err as Error);
  }
}

// Export wrapped handler for Datadog instrumentation
export const handler = wrapHandler(handlerImpl);
