/**
 * Lambda handler: Get game state
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { sendDistributionMetric } from 'datadog-lambda-js';
import { GameService } from '../services/GameService.js';
import { success, error } from '../utils/response.js';
import { generateETag, parseIfNoneMatch, etagsMatch } from '../utils/etag.js';
import { createLogger } from '../utils/logger.js';

const gameService = new GameService();

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const startTime = Date.now();
  const gameId = event.pathParameters?.gameId;
  const logger = createLogger({ operation: 'getGameState', gameId });

  try {
    if (!gameId) {
      logger.warn('Missing game ID in request');
      return error(new Error('Game ID is required'), 400);
    }

    const playerId = event.queryStringParameters?.playerId;
    const ifNoneMatch = parseIfNoneMatch(event.headers?.['If-None-Match'] || event.headers?.['if-none-match']);

    const gameState = await gameService.getGameState(gameId, playerId);

    // Generate ETag from current game state
    const etag = generateETag(gameState.game, gameState.guesses);

    // Check if client's cached version is still valid
    if (ifNoneMatch && etagsMatch(etag, ifNoneMatch)) {
      const duration = Date.now() - startTime;
      logger.info('Returning 304 Not Modified', { duration });

      sendDistributionMetric('jotto.game.state.cached', 1, 'game_id:' + gameId);

      return {
        statusCode: 304,
        headers: {
          'ETag': etag,
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*'
        },
        body: ''
      };
    }

    const duration = Date.now() - startTime;
    logger.info('Returning fresh game state', { duration });

    // Send custom metric to Datadog
    sendDistributionMetric('jotto.game.state.fetched', 1, 'game_id:' + gameId);

    // Return fresh data with ETag
    const response = success(gameState);
    response.headers = {
      ...response.headers,
      'ETag': etag,
      'Cache-Control': 'no-cache'
    };

    return response;
  } catch (err) {
    const duration = Date.now() - startTime;
    logger.error('Failed to get game state', {
      duration,
      error: (err as Error).message
    });

    // Track errors in Datadog
    sendDistributionMetric('jotto.game.state.error', 1);
    return error(err as Error);
  }
}
