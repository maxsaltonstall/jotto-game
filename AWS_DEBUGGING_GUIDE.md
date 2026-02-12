# AWS Debugging Guide for Jotto Game

## Quick Setup

**Enable debugging aliases:**
```bash
source .aws-debug-aliases
```

**Add to your shell profile** (optional, for persistent access):
```bash
echo "source ~/jottogame/.aws-debug-aliases" >> ~/.zshrc  # or ~/.bashrc
```

## Tools Installed

- ✅ **AWS CLI** - Pre-installed, used for all AWS interactions
- ✅ **jq** - JSON processor for parsing AWS responses
- ✅ **wscat** - WebSocket client for testing WebSocket connections
- ✅ **AWS MCP Server** - Claude Code integration for AWS services
- ⚠️ **Datadog CLI** - Skipped (tap issue), use web UI instead

## Common Debugging Workflows

### 1. Investigate Lambda Errors

**Scenario:** Users report game not updating or errors

```bash
# Step 1: Tail live logs
jotto-logs-make-guess

# Step 2: Query recent errors (last 2 hours)
jotto-errors MakeGuessFn 2

# Step 3: Get query results (use query ID from step 2)
jotto-get-query <query-id-from-step-2>

# Step 4: Check Lambda metrics
jotto-lambda-metrics MakeGuessFn 2

# Step 5: Check Lambda configuration
jotto-lambda-config MakeGuessFn
```

### 2. Debug WebSocket Connection Issues

**Scenario:** Real-time updates not working

```bash
# Step 1: Check WebSocket routes are configured
jotto-ws-routes

# Step 2: Check active connections for a game
jotto-connections abc123

# Step 3: Tail WebSocket connect handler logs
jotto-logs-ws-connect

# Step 4: Test WebSocket connection manually
jotto-ws-test abc123 player1

# Step 5: Check WebSocket message handler logs
jotto-logs-ws-message
```

### 3. Diagnose Performance Issues

**Scenario:** Slow game responses or timeouts

```bash
# Step 1: Check DynamoDB throttling
jotto-throttling 1

# Step 2: Check Lambda duration metrics
jotto-lambda-metrics MakeGuessFn 1

# Step 3: Get game state from DynamoDB
jotto-game abc123

# Step 4: Check Lambda memory configuration
jotto-lambda-config MakeGuessFn
```

### 4. Monitor Deployment

**Scenario:** Just deployed, verify everything works

```bash
# Step 1: Check stack status
jotto-stack-status

# Step 2: Check recent stack events
jotto-stack-events 50

# Step 3: Verify all Lambda functions are healthy
jotto-lambda-metrics CreateGameFn 1
jotto-lambda-metrics JoinGameFn 1
jotto-lambda-metrics MakeGuessFn 1
jotto-lambda-metrics WsConnectFn 1

# Step 4: Test WebSocket endpoint
jotto-ws-test test-game test-player
```

## All Available Commands

Run `jotto-help` to see the full list of commands.

### CloudWatch Logs

| Command | Description |
|---------|-------------|
| `jotto-logs-make-guess` | Tail makeGuess Lambda logs (live) |
| `jotto-logs-ws-connect` | Tail WebSocket connect logs |
| `jotto-logs-ws-disconnect` | Tail WebSocket disconnect logs |
| `jotto-logs-ws-message` | Tail WebSocket message logs |
| `jotto-logs-create-game` | Tail createGame Lambda logs |
| `jotto-logs-join-game` | Tail joinGame Lambda logs |
| `jotto-errors <function> <hours>` | Query errors (default: MakeGuessFn, 1h) |
| `jotto-get-query <query-id>` | Get CloudWatch Insights query results |

### DynamoDB

| Command | Description |
|---------|-------------|
| `jotto-connections [game-id]` | List all/specific WebSocket connections |
| `jotto-game <game-id>` | Get game state from DynamoDB |
| `jotto-throttling [hours]` | Check for DynamoDB throttling |

### Lambda

| Command | Description |
|---------|-------------|
| `jotto-lambda-config <function>` | Get Lambda configuration (memory, timeout, env vars) |
| `jotto-lambda-metrics <function> <hours>` | Get invocations, errors, duration |

### WebSocket

| Command | Description |
|---------|-------------|
| `jotto-ws-test <game-id> [player-id]` | Test WebSocket connection interactively |
| `jotto-ws-routes` | List WebSocket API routes ($connect, $disconnect, etc) |
| `jotto-ws-integrations` | List WebSocket Lambda integrations |

### CloudFormation

| Command | Description |
|---------|-------------|
| `jotto-stack-status` | Get stack status and outputs |
| `jotto-stack-events [limit]` | Get recent stack events (default: 20) |

## Function Names Reference

When using commands that accept `<function>`, use these names (without the `JottoGameStackV2-` prefix):

- `MakeGuessFn` - Handle player guesses
- `CreateGameFn` - Create new games
- `JoinGameFn` - Join existing games
- `GetGameFn` - Get game state (REST API)
- `ListGamesFn` - List available games
- `WsConnectFn` - WebSocket $connect handler
- `WsDisconnectFn` - WebSocket $disconnect handler
- `WsMessageFn` - WebSocket $default handler
- `CreateAIGameFn` - Create AI opponent games

## Datadog Monitoring

Since the Datadog CLI had installation issues, use the **Datadog web UI** instead:

**Access Logs:**
1. Go to https://app.datadoghq.com/logs
2. Search: `service:jotto-game status:error`
3. Filter by time range and specific Lambda function

**Common Datadog Queries:**
```
# Lambda errors in last hour
service:jotto-game status:error

# Slow Lambda executions (>3 seconds)
service:jotto-game @duration:>3000

# WebSocket connection failures
service:jotto-game @websocket.status:failed

# Specific Lambda function
service:jotto-game @aws.lambda.function_name:JottoGameStackV2-MakeGuessFn

# DynamoDB throttling
service:jotto-game @dynamodb.throttled:true
```

## AWS MCP Server (via Claude Code)

Your AWS MCP server is already configured. When working with Claude Code, you can use natural language to:

**Examples:**
- "Show me CloudWatch logs for MakeGuessFn in the last hour"
- "Check DynamoDB throttling metrics for JottoGameTable"
- "List all Lambda functions in the JottoGameStackV2 stack"
- "Get WebSocket API configuration for api-id vaomw6i5c0"

## Tips & Best Practices

### Performance Investigation

1. **Always start with metrics** before diving into logs
   ```bash
   jotto-lambda-metrics MakeGuessFn 2  # Get overview first
   ```

2. **Check throttling** if you see intermittent errors
   ```bash
   jotto-throttling 2
   ```

3. **Use CloudWatch Insights** for complex queries
   ```bash
   jotto-errors MakeGuessFn 2
   ```

### WebSocket Debugging

1. **Check connections table** before investigating handlers
   ```bash
   jotto-connections  # List all connections
   jotto-connections abc123  # Specific game
   ```

2. **Test manually** before blaming code
   ```bash
   jotto-ws-test test-game test-player
   # Then send: {"type": "PING"}
   # Should receive: {"type": "PONG"}
   ```

3. **Monitor all handlers** for connection lifecycle
   ```bash
   # Terminal 1: Connect handler
   jotto-logs-ws-connect

   # Terminal 2: Message handler
   jotto-logs-ws-message

   # Terminal 3: Test connection
   jotto-ws-test test-game test-player
   ```

### Cost Monitoring

**Track Lambda invocations:**
```bash
# Check invocations for last 24 hours
jotto-lambda-metrics MakeGuessFn 24

# Compare before/after WebSocket rollout
# Expected: 70-80% reduction
```

**Monitor DynamoDB consumption:**
```bash
# Check for throttling (indicates need to increase capacity)
jotto-throttling 24
```

## Troubleshooting the Tools

**If aliases don't work:**
```bash
# Re-source the file
source ~/jottogame/.aws-debug-aliases

# Check if file exists
ls -la ~/jottogame/.aws-debug-aliases
```

**If AWS commands fail with authentication:**
```bash
# Check AWS credentials
aws sts get-caller-identity

# Re-authenticate with SSO
aws sso login --profile default
```

**If wscat command not found:**
```bash
# Verify installation
which wscat

# Reinstall if needed
npm install -g wscat
```

## Quick Reference Card

**Most commonly used commands:**
```bash
# Live debugging
jotto-logs-make-guess              # Watch logs in real-time

# Error investigation
jotto-errors MakeGuessFn 1         # Find recent errors
jotto-lambda-metrics MakeGuessFn 1 # Check performance

# WebSocket testing
jotto-ws-test <game-id> <player-id>  # Manual connection test
jotto-connections <game-id>          # Check active connections

# Infrastructure status
jotto-stack-status                 # Overall stack health
jotto-lambda-config MakeGuessFn   # Check configuration
```

Print this guide and keep it handy! 🚀
