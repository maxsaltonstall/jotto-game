/**
 * Datadog Lambda wrapper utility
 * Provides unified instrumentation for logs, traces, and metrics
 */

import { datadog } from 'datadog-lambda-js';
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

/**
 * Wrap a Lambda handler with Datadog instrumentation
 * This enables:
 * - Distributed tracing (APM)
 * - Log correlation with traces
 * - Automatic metrics (invocations, errors, duration)
 * - Custom metrics support
 *
 * Configuration is handled via environment variables (DD_*) set in CDK stack
 */
export function wrapHandler(
  handler: (event: APIGatewayProxyEvent, context: Context) => Promise<APIGatewayProxyResult>
) {
  // Use default configuration - all settings controlled via environment variables
  return datadog(handler);
}
