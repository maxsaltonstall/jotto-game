/**
 * Lambda handler: Get user stats
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { sendDistributionMetric } from 'datadog-lambda-js';
import { StatsService } from '../services/StatsService.js';
import { success, error } from '../utils/response.js';
import { wrapHandler } from '../utils/datadogWrapper.js';

const statsService = new StatsService();

async function handlerImpl(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
  try {
    const userId = event.queryStringParameters?.userId;

    if (!userId) {
      return error(new Error('User ID is required'), 400);
    }

    const stats = await statsService.getUserStats(userId);

    // Send custom metric to Datadog
    sendDistributionMetric('jotto.stats.retrieved', 1);

    return success({ stats });
  } catch (err) {
    // Track errors in Datadog
    sendDistributionMetric('jotto.stats.error', 1);
    return error(err as Error);
  }
}

// Export wrapped handler for Datadog instrumentation
export const handler = wrapHandler(handlerImpl);
