# Datadog Lambda Instrumentation Setup

This document explains how Datadog instrumentation is configured for the Jotto Game Lambda functions following official Datadog best practices.

## Architecture Overview

The implementation uses **two Datadog Lambda layers**:

1. **Datadog Lambda Library Layer** (`Datadog-Node20-x:133`)
   - Provides the `datadog-lambda-js` and `dd-trace` libraries
   - Enables automatic tracing and metrics collection
   - ARN: `arn:aws:lambda:us-east-1:464622532012:layer:Datadog-Node20-x:133`

2. **Datadog Extension Layer** (`Datadog-Extension:90`)
   - Efficiently collects and forwards telemetry to Datadog
   - Sends data directly to Datadog API (not through CloudWatch Logs)
   - Reduces latency and CloudWatch costs
   - ARN: `arn:aws:lambda:us-east-1:464622532012:layer:Datadog-Extension:90`

## Environment Variables

All Lambda functions are configured with these Datadog environment variables (set in CDK):

```typescript
DD_SITE: 'us5.datadoghq.com'              // Datadog site
DD_API_KEY_SECRET_ARN: '<secret-arn>'      // API key from Secrets Manager
DD_FLUSH_TO_LOG: 'false'                   // false when using Extension
DD_TRACE_ENABLED: 'true'                   // Enable APM tracing
DD_LOGS_INJECTION: 'true'                  // Correlate logs with traces
DD_SERVICE: 'jotto-game'                   // Service name
DD_ENV: 'production'                       // Environment
DD_VERSION: '1.0.0'                        // Version for deployment tracking
```

## Lambda Handler Pattern

All handlers follow this pattern:

```typescript
import { datadog } from 'datadog-lambda-js';
import { sendDistributionMetric } from 'datadog-lambda-js';
import { wrapHandler } from '../utils/datadogWrapper.js';

async function handlerImpl(event, context) {
  // Your handler logic here

  // Send custom metrics
  sendDistributionMetric('jotto.metric.name', value, 'tag:value');

  return response;
}

// Export wrapped handler
export const handler = wrapHandler(handlerImpl);
```

## What Gets Monitored

### Automatic Metrics
- **Invocations**: Count of Lambda invocations
- **Errors**: Count and rate of errors
- **Duration**: Execution time (p50, p95, p99)
- **Cold starts**: Frequency and duration

### Custom Metrics
Each Lambda function sends custom business metrics:
- `jotto.game.created` - New game creation
- `jotto.guess.made` - Guess attempts
- `jotto.guess.match_count` - Letter matches per guess
- `jotto.game.won` - Game wins
- `jotto.websocket.connected` - WebSocket connections
- `jotto.websocket.disconnected` - WebSocket disconnections

### Distributed Tracing
- Automatic trace instrumentation for:
  - DynamoDB operations
  - HTTP/HTTPS requests
  - WebSocket operations
- Trace correlation across Lambda invocations
- X-Ray integration support

### Log Correlation
- All logs include trace and span IDs
- JSON structured logging with correlation
- Easy filtering by trace ID in Datadog

## CDK Configuration

The infrastructure code (in `infrastructure/lib/jottogame-stack.ts`) sets up:

```typescript
// Both layers
const datadogLayer = lambda.LayerVersion.fromLayerVersionArn(...);
const datadogExtension = lambda.LayerVersion.fromLayerVersionArn(...);

// Lambda props with both layers
const lambdaProps = {
  runtime: lambda.Runtime.NODEJS_20_X,
  environment: lambdaEnvironment,
  layers: [datadogLayer, datadogExtension]
};

// Secrets Manager permission
datadogApiKeySecret.grantRead(lambdaFunction);
```

## Deployment

1. **Update Datadog API Key** (one-time):
   ```bash
   aws secretsmanager update-secret \
     --secret-id jotto-game-datadog-api-key \
     --secret-string "your-datadog-api-key"
   ```

2. **Deploy infrastructure**:
   ```bash
   cd infrastructure
   cdk deploy JottoGameStackV2
   ```

3. **Verify in Datadog**:
   - Check APM → Services → jotto-game
   - Check Metrics → Lambda metrics
   - Check Logs → Filter by service:jotto-game

## Best Practices Followed

✅ Use both Lambda Library and Extension layers
✅ Set `DD_FLUSH_TO_LOG=false` with Extension
✅ Store API key in Secrets Manager, not environment
✅ Use simplified wrapper configuration (defaults via env vars)
✅ Send custom business metrics for game events
✅ Use JSON structured logging for correlation
✅ Tag metrics with relevant context (gameId, playerId)

## References

- [Datadog Node.js Lambda Instrumentation](https://docs.datadoghq.com/serverless/aws_lambda/instrumentation/nodejs/)
- [Datadog Lambda Extension](https://docs.datadoghq.com/serverless/libraries_integrations/extension/)
- [datadog-lambda-js GitHub](https://github.com/DataDog/datadog-lambda-js)
- [Datadog Lambda Layer Releases](https://github.com/DataDog/datadog-lambda-js/releases)

## Updating Layers

To update to newer layer versions:

1. Check latest versions at [Datadog releases](https://github.com/DataDog/datadog-lambda-js/releases)
2. Update ARNs in `infrastructure/lib/jottogame-stack.ts`
3. Redeploy with `cdk deploy`

Current versions:
- Lambda Library: v133 (Node20-x)
- Extension: v90
