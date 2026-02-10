/**
 * Lambda handler: Register a new user
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { sendDistributionMetric } from 'datadog-lambda-js';
import { AuthService } from '../services/AuthService.js';
import { success, error, parseBody } from '../utils/response.js';
import type { CreateUserRequest } from '../models/user-types.js';

const authService = new AuthService();

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const request = parseBody<CreateUserRequest>(event.body);

    const result = await authService.registerUser(
      request.username,
      request.password,
      request.displayName,
      request.email
    );

    // Send custom metric to Datadog
    sendDistributionMetric('jotto.user.registered', 1);

    return success(result, 201);
  } catch (err) {
    // Track errors in Datadog
    sendDistributionMetric('jotto.user.register.error', 1);
    return error(err as Error);
  }
}
