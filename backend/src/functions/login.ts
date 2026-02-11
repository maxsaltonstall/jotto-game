/**
 * Lambda handler: Login user
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { sendDistributionMetric } from 'datadog-lambda-js';
import { AuthService } from '../services/AuthService.js';
import { success, error, parseBody } from '../utils/response.js';
import type { LoginRequest } from '../models/user-types.js';
import { wrapHandler } from '../utils/datadogWrapper.js';

const authService = new AuthService();

async function handlerImpl(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
  try {
    const request = parseBody<LoginRequest>(event.body);

    const result = await authService.loginUser(request.username, request.password);

    // Send custom metric to Datadog
    sendDistributionMetric('jotto.user.login', 1);

    return success(result);
  } catch (err) {
    // Track errors in Datadog
    sendDistributionMetric('jotto.user.login.error', 1);
    return error(err as Error);
  }
}

// Export wrapped handler for Datadog instrumentation
export const handler = wrapHandler(handlerImpl);
