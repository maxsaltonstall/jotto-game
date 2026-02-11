# Datadog Integration Guide

## Overview

Your Jotto Game application is now fully instrumented with Datadog for comprehensive observability:

- ✅ **Logs**: Structured JSON logs from all Lambda functions
- ✅ **Traces**: Distributed tracing with APM for request flows
- ✅ **Metrics**: Custom metrics + automatic Lambda metrics
- ✅ **Error Tracking**: Automatic error capture and reporting

## What Was Configured

### 1. Backend Instrumentation

All 9 Lambda handlers are now wrapped with Datadog:
- `createGame.ts` - Game creation traces
- `joinGame.ts` - Player join traces
- `makeGuess.ts` - Guess submission traces
- `getGameState.ts` - State retrieval traces
- `listGames.ts` - Game listing traces
- `getStats.ts` - Stats retrieval traces
- `register.ts` - User registration traces
- `login.ts` - Authentication traces
- `createAIGame.ts` - AI game creation traces

### 2. Dependencies Installed

- `datadog-lambda-js@^12.133.0` - Datadog Lambda SDK
- `dd-trace` - APM tracing library

### 3. Infrastructure Configuration

**Datadog Lambda Layer**: `arn:aws:lambda:us-east-1:464622532012:layer:Datadog-Node20-x:113`

**Environment Variables**:
```bash
DD_SITE=us5.datadoghq.com              # Your Datadog site
DD_API_KEY_SECRET_ARN=...              # API key from Secrets Manager
DD_FLUSH_TO_LOG=true                   # Send telemetry via CloudWatch
DD_TRACE_ENABLED=true                  # Enable APM tracing
DD_LOGS_INJECTION=true                 # Inject trace context into logs
DD_SERVICE=jotto-game                  # Service name in Datadog
DD_ENV=production                      # Environment tag
```

### 4. Custom Metrics Being Sent

Your application sends these custom metrics to Datadog:

**Game Metrics**:
- `jotto.game.created` - Game creation counter
- `jotto.game.joined` - Player join counter
- `jotto.guess.made` - Guess submission counter
- `jotto.game.won` - Game completion counter
- `jotto.game.state.fetched` - State fetch counter
- `jotto.game.state.cached` - 304 response counter (ETag hits)

**Error Metrics**:
- `jotto.game.create.error` - Game creation failures
- `jotto.game.join.error` - Join failures
- `jotto.guess.error` - Guess failures
- `jotto.game.state.error` - State fetch failures

## Verifying Integration in Datadog

### 1. Check APM Traces

1. Go to **APM → Traces** in Datadog
2. Select service: `jotto-game`
3. Select environment: `production`
4. You should see traces for all Lambda invocations:
   - Request duration
   - Span hierarchy (DynamoDB calls, etc.)
   - Errors with stack traces

**Example Trace Flow**:
```
POST /games (createGame)
  ├─ DynamoDB PutItem (game record)
  ├─ DynamoDB PutItem (player record)
  └─ Datadog metric: jotto.game.created
```

### 2. Check Logs

1. Go to **Logs → Explorer** in Datadog
2. Filter by: `service:jotto-game env:production`
3. You should see structured JSON logs with:
   - Automatic correlation with traces (trace_id, span_id)
   - Log level (INFO, ERROR, WARN)
   - Operation context (gameId, playerId, operation)
   - Duration metrics

**Example Log Entry**:
```json
{
  "level": "INFO",
  "message": "Game created successfully",
  "gameId": "space-scale-shirt",
  "duration": 234,
  "timestamp": "2026-02-10T15:20:00.000Z",
  "dd.trace_id": "1234567890",
  "dd.span_id": "9876543210"
}
```

### 3. Check Metrics

1. Go to **Metrics → Explorer** in Datadog
2. Search for metrics starting with `jotto.`
3. You should see:
   - Custom metrics: `jotto.game.created`, `jotto.guess.made`, etc.
   - Lambda metrics: `aws.lambda.invocations`, `aws.lambda.duration`, `aws.lambda.errors`

**Create a Dashboard**:
```
- Games created per hour (jotto.game.created)
- Active games (jotto.game.joined)
- Guess rate (jotto.guess.made)
- Error rate (sum of *.error metrics)
- Lambda duration P50/P95/P99
```

### 4. Check Service Map

1. Go to **APM → Service Map**
2. You should see `jotto-game` connected to:
   - API Gateway
   - DynamoDB
   - Secrets Manager

### 5. Check Error Tracking

1. Go to **APM → Error Tracking**
2. Filter by: `service:jotto-game`
3. Errors are automatically grouped by:
   - Error type
   - Stack trace
   - Affected operations

## Testing the Integration

Run these commands to generate telemetry:

```bash
# Create a game (generates traces, logs, metrics)
curl -X POST https://cxa2b8e6b2.execute-api.us-east-1.amazonaws.com/prod/games \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "test-player",
    "playerName": "Test User",
    "secretWord": "CLOUD"
  }'

# List games (check ETag caching metrics)
curl "https://cxa2b8e6b2.execute-api.us-east-1.amazonaws.com/prod/games?status=WAITING"

# Trigger an error (check error tracking)
curl -X POST https://cxa2b8e6b2.execute-api.us-east-1.amazonaws.com/prod/games \
  -H "Content-Type: application/json" \
  -d '{}'
```

Within 1-2 minutes, you should see:
- Traces in APM
- Logs in Logs Explorer
- Metrics incrementing in Metrics Explorer

## Monitoring Best Practices

### Create Monitors

Set up alerts for:

1. **High Error Rate**:
   ```
   Alert when: sum(jotto.*.error) > 10 in 5 minutes
   ```

2. **Slow Lambda Performance**:
   ```
   Alert when: avg(aws.lambda.duration) > 5000ms for jotto-game
   ```

3. **Low Game Creation Rate**:
   ```
   Alert when: rate(jotto.game.created) < 1 per hour (indicates service issues)
   ```

### Dashboard Widgets

Create a dashboard with:

1. **Request Rate**: Line chart of Lambda invocations
2. **Error Rate**: Bars of error metrics by type
3. **Latency**: Heatmap of P50/P95/P99 durations
4. **Game Funnel**:
   - Games created → Games joined → Games completed
5. **ETag Efficiency**:
   - Ratio of `jotto.game.state.cached` to `jotto.game.state.fetched`

## Architecture

```
User Request
    ↓
API Gateway
    ↓
Lambda Function (with Datadog wrapper)
    ├─ dd-trace (APM instrumentation)
    ├─ datadog-lambda-js (metrics & logs)
    └─ SimpleLogger (structured logging)
    ↓
CloudWatch Logs
    ↓
Datadog Forwarder (automatic via Layer)
    ↓
Datadog Platform
    ├─ APM (traces)
    ├─ Logs (correlated)
    └─ Metrics (custom + Lambda)
```

## Troubleshooting

### No Traces Appearing

1. Check Lambda environment variable `DD_TRACE_ENABLED=true`
2. Verify API key is correct in Secrets Manager:
   ```bash
   aws secretsmanager get-secret-value \
     --secret-id jotto-game-datadog-api-key \
     --profile salt-jotto-cli \
     --query SecretString --output text
   ```
3. Check Lambda logs for Datadog connection errors

### Logs Not Correlated with Traces

1. Verify `DD_LOGS_INJECTION=true` in Lambda environment
2. Check that logs include `dd.trace_id` field
3. Ensure Datadog Lambda Layer version is up to date

### Metrics Not Updating

1. Verify `sendDistributionMetric()` calls in code
2. Check metric name format (should start with `jotto.`)
3. Look for Datadog flush errors in CloudWatch Logs

### High Costs

If Datadog costs are high:
- Reduce trace sampling rate: `DD_TRACE_SAMPLE_RATE=0.1` (10% of traces)
- Filter noisy logs in Datadog UI
- Use metric aggregation to reduce cardinality

## Next Steps

1. **Create Dashboards**: Build custom dashboards for game metrics
2. **Set Up Monitors**: Configure alerts for critical errors
3. **Enable Profiling**: Add `DD_PROFILING_ENABLED=true` for CPU profiling
4. **Add Custom Spans**: Instrument specific code sections with `dd-trace`
5. **Frontend RUM**: Consider adding Datadog Real User Monitoring to frontend

## Resources

- [Datadog Lambda Documentation](https://docs.datadoghq.com/serverless/aws_lambda/)
- [dd-trace Node.js](https://docs.datadoghq.com/tracing/setup_overview/setup/nodejs/)
- [Custom Metrics Guide](https://docs.datadoghq.com/metrics/custom_metrics/)
- Your Datadog site: https://us5.datadoghq.com

## Summary

Your Jotto Game now has **full observability** with:
- 🔍 Distributed tracing for request flows
- 📊 Custom metrics for business KPIs
- 📝 Structured logs correlated with traces
- 🚨 Error tracking for production issues
- ⚡ Performance monitoring for Lambda functions

All telemetry is automatically sent to your Datadog account at `us5.datadoghq.com`.
