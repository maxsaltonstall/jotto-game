# How to Find Your Logs in Datadog

## ✅ What Was Set Up

I just connected your Lambda CloudWatch logs to your Datadog Forwarder. All logs are now being forwarded automatically!

**Subscribed Log Groups**:
- ✅ CreateGameFunction
- ✅ JoinGameFunction
- ✅ MakeGuessFunction
- ✅ GetGameStateFunction
- ✅ ListGamesFunction
- ✅ CreateAIGameFunction

(GetStats, Register, Login will auto-subscribe when first invoked)

## 🔍 Finding Logs in Datadog

### Step 1: Go to Logs Explorer

Open: https://us5.datadoghq.com/logs

### Step 2: Try These Searches

**Option 1: Search by Lambda source**
```
source:lambda
```
This shows ALL Lambda logs in your account.

**Option 2: Search by specific function**
```
JottoGameStack-ListGamesFunction
```
Just paste the function name directly.

**Option 3: Search by service (if tags are working)**
```
service:jotto-game
```
This might take a few minutes to start working.

**Option 4: Search by AWS account**
```
account_id:148203325623
```
Shows all logs from your AWS account.

### Step 3: What You'll See

Your logs will include:

1. **Datadog Metrics** (JSON format):
   ```json
   {"m":"jotto.games.listed","v":1,"t":["status:WAITING"]}
   ```

2. **Lambda Execution Logs**:
   ```
   START RequestId: xxx
   END RequestId: xxx
   REPORT RequestId: xxx Duration: 12.34 ms
   ```

3. **Application Logs** (from SimpleLogger):
   ```json
   {
     "level": "INFO",
     "message": "Game created successfully",
     "gameId": "space-scale-shirt",
     "duration": 234
   }
   ```

## 🕐 Timing

- **First logs**: Should appear within 1-2 minutes
- **Delay**: CloudWatch → Forwarder → Datadog takes ~30-60 seconds
- **Historical logs**: Only new logs after subscription are forwarded

## 🎯 Quick Verification

Run this to generate logs RIGHT NOW:
```bash
curl "https://cxa2b8e6b2.execute-api.us-east-1.amazonaws.com/prod/games?status=WAITING"
```

Then in Datadog:
1. Go to Logs Explorer
2. Set time range to "Past 5 minutes"
3. Search: `ListGamesFunction`
4. You should see the invocation logs!

## 📊 What You'll See in Each Tool

### Logs Explorer
- Raw Lambda logs
- Structured JSON logs
- Metrics as log entries
- Request/response details

### APM → Traces
- Distributed traces (might take longer to appear)
- Span duration
- DynamoDB queries
- Error traces

### Metrics Explorer
- Search: `jotto.*`
- Custom game metrics
- Lambda performance metrics

## 🐛 Troubleshooting

### "I don't see any logs"

1. **Wait 2 minutes** - Initial forwarding takes time
2. **Trigger traffic**:
   ```bash
   curl "https://cxa2b8e6b2.execute-api.us-east-1.amazonaws.com/prod/games?status=WAITING"
   ```
3. **Check time range** - Set to "Past 15 minutes" in Datadog
4. **Search by function name** instead of service tag:
   ```
   JottoGameStack-ListGamesFunction
   ```

### "I see Lambda logs but not application logs"

The SimpleLogger logs appear mixed with Lambda system logs. Look for JSON entries with `"level":"INFO"`.

### "Metrics work but logs don't"

Verify the subscription filter:
```bash
aws logs describe-subscription-filters \
  --log-group-name /aws/lambda/JottoGameStack-ListGamesFunction6208DAE9-SZkemMeKsi7h \
  --profile salt-jotto-cli
```

Should show: `DatadogLogForwarder-*`

## 🎨 Create a Logs Dashboard

Once logs are flowing:

1. Go to Logs → Patterns
2. See common log patterns automatically detected
3. Create saved views for:
   - Error logs: `level:ERROR`
   - Game created: `"Game created successfully"`
   - Slow requests: `duration:>1000`

## 📈 Metrics Are Already Working!

Even if logs take time, metrics are already flowing:
- Go to Metrics → Explorer
- Search: `jotto.games.listed`
- You'll see data immediately!

## Summary

**What's flowing to Datadog NOW**:
- ✅ Metrics (via Lambda Layer)
- ✅ CloudWatch Logs (via Forwarder)
- ⏳ APM Traces (may take 5-10 min to appear)

**Where to look**:
- Logs: https://us5.datadoghq.com/logs → Search: `ListGamesFunction`
- Metrics: https://us5.datadoghq.com/metric/explorer → Search: `jotto.*`
- APM: https://us5.datadoghq.com/apm/traces → Filter: `JottoGameStack`
