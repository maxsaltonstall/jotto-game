/**
 * Lambda handler: List games
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { sendDistributionMetric } from 'datadog-lambda-js';
import { GameService } from '../services/GameService.js';
import { success, error } from '../utils/response.js';
import { wrapHandler } from '../utils/datadogWrapper.js';

const gameService = new GameService();

async function handlerImpl(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
  try {
    const status = event.queryStringParameters?.status || 'WAITING';

    let games;
    if (status === 'WAITING') {
      games = await gameService.listAvailableGames();
    } else if (status === 'ACTIVE') {
      games = await gameService.listActiveGames();
    } else {
      return error(new Error('Invalid status parameter'), 400);
    }

    // Send custom metrics to Datadog
    sendDistributionMetric('jotto.games.listed', 1, 'status:' + status);
    sendDistributionMetric('jotto.games.count', games.length, 'status:' + status);

    return success({ games });
  } catch (err) {
    // Track errors in Datadog
    sendDistributionMetric('jotto.games.list.error', 1);
    return error(err as Error);
  }
}

// Export wrapped handler for Datadog instrumentation
export const handler = wrapHandler(handlerImpl);
