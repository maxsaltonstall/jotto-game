/**
 * Lambda handler: Make a guess
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { sendDistributionMetric } from 'datadog-lambda-js';
import { GameService } from '../services/GameService.js';
import { success, error, parseBody } from '../utils/response.js';
import type { MakeGuessRequest } from '../models/types.js';
import { createLogger } from '../utils/logger.js';

const gameService = new GameService();

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const startTime = Date.now();
  const gameId = event.pathParameters?.gameId;
  const logger = createLogger({ operation: 'makeGuess', gameId });

  try {
    if (!gameId) {
      logger.warn('Missing game ID in request');
      return error(new Error('Game ID is required'), 400);
    }

    const request = parseBody<MakeGuessRequest>(event.body);

    logger.info('Processing guess', {
      playerId: request.playerId,
      guessWord: request.guessWord
    });

    const guess = await gameService.makeGuess(gameId, request.playerId, request.guessWord);

    const duration = Date.now() - startTime;
    logger.info('Guess processed', {
      matchCount: guess.matchCount,
      isWinningGuess: guess.isWinningGuess,
      duration
    });

    // Send custom metrics to Datadog
    sendDistributionMetric('jotto.guess.made', 1, 'game_id:' + gameId);
    sendDistributionMetric('jotto.guess.match_count', guess.matchCount);

    // Track winning guesses
    if (guess.matchCount === 5) {
      sendDistributionMetric('jotto.game.won', 1, 'game_id:' + gameId, 'player_id:' + request.playerId);
    }

    return success({ guess });
  } catch (err) {
    const duration = Date.now() - startTime;
    logger.error('Failed to process guess', {
      duration,
      error: (err as Error).message
    });

    // Track errors in Datadog
    sendDistributionMetric('jotto.guess.error', 1);
    return error(err as Error);
  }
}
