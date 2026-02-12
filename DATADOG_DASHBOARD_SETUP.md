# Datadog Dashboard Setup for Jotto Game

## 📊 Quick Import

### Option 1: Datadog UI (Easiest)
1. Go to https://app.datadoghq.com/dashboard/lists
2. Click **"New Dashboard"** → **"Import Dashboard JSON"**
3. Copy contents of `datadog-dashboard.json`
4. Paste and click **"Import"**

### Option 2: Datadog API
```bash
curl -X POST "https://api.datadoghq.com/api/v1/dashboard" \
  -H "Content-Type: application/json" \
  -H "DD-API-KEY: ${DD_API_KEY}" \
  -H "DD-APPLICATION-KEY: ${DD_APP_KEY}" \
  -d @datadog-dashboard.json
```

### Option 3: Terraform
```hcl
resource "datadog_dashboard_json" "jotto_game" {
  dashboard = file("${path.module}/datadog-dashboard.json")
}
```

---

## 📈 Dashboard Sections

### 1. **Game Engagement & Activity** (Blue)
- Total Games Created
- Games Completed
- Average Game Duration (minutes)
- Average Guesses per Game

**What to watch:** Low completion rates might indicate players getting stuck or frustrated.

### 2. **AI Opponent Performance** (Purple)
- AI Move Latency (p50, p95, p99)
- LLM Token Usage (Input vs Output)
- Estimated Hourly AI Cost
- Estimated Daily AI Cost

**What to watch:**
- Latency > 2000ms = slow AI responses
- Daily cost trending up = more AI games being played

**Cost Formula:**
- Input: $0.001 per 1M tokens (Claude 3.5 Haiku)
- Output: $0.005 per 1M tokens
- Target: <$1/day for typical usage

### 3. **Lambda Performance** (Orange)
- Duration by Function (p95)
- Invocations by Function
- Lambda Errors

**What to watch:**
- Cold starts causing high p95 latency
- Error spikes on specific functions
- MakeGuessFunction should be fastest (<500ms)

### 4. **WebSocket Real-Time** (Green)
- Active WebSocket Connections
- Message Latency
- WebSocket Handler Duration

**What to watch:**
- Connections dropping unexpectedly
- Message latency > 500ms = slow real-time updates
- Handler duration spikes = performance issues

### 5. **Error Tracking** (Red)
- Error Rate by Type
- Failed Guesses
- Recent Error Logs

**What to watch:**
- ValidationError = bad input from users
- GameStateError = logic bugs
- Any error rate > 1% = investigate immediately

### 6. **Cost Summary** (Yellow)
- Lambda Billed Duration
- Estimated Lambda Cost/Day
- Total AI API Cost/Day
- Total Estimated Cost/Day

**Expected costs:**
- Lambda: ~$0.01-0.05/day (depends on traffic)
- AI API: ~$0.10-1.00/day (depends on AI game usage)
- Total: <$2/day for low-medium traffic

---

## 🚨 Recommended Monitors & Alerts

### Critical Alerts (PagerDuty/Slack)

1. **High Error Rate**
```
avg(last_5m):sum:jotto.error{*}.as_count() > 10
```
Alert when: More than 10 errors in 5 minutes
Action: Check logs and recent deployments

2. **Lambda Function Failing**
```
avg(last_5m):sum:aws.lambda.errors{service:jotto-game}.as_count() by {functionname} > 5
```
Alert when: Any function has >5 errors in 5 minutes
Action: Check CloudWatch logs for that function

3. **AI Response Too Slow**
```
avg(last_10m):p95:jotto.llm.latency{*} > 3000
```
Alert when: AI taking >3 seconds (p95)
Action: Check Anthropic API status, consider caching

### Warning Alerts (Email/Slack)

4. **High Daily Cost**
```
sum(last_1d):((jotto.llm.tokens.input{*}.as_count() * 0.001 / 1000000) + (jotto.llm.tokens.output{*}.as_count() * 0.005 / 1000000)) > 5
```
Alert when: AI costs exceed $5/day
Action: Review usage patterns, consider rate limiting

5. **WebSocket Connection Issues**
```
avg(last_10m):sum:jotto.error{error_type:websocket_connect_error}.as_count() > 5
```
Alert when: More than 5 WebSocket connection errors in 10 minutes
Action: Check API Gateway WebSocket API health

6. **No Activity**
```
sum(last_1h):jotto.game.created{*}.as_count() < 1
```
Alert when: No games created in past hour (during expected active hours)
Action: Check if app is down or deployment issue

---

## 🎯 Key Performance Indicators (KPIs)

### Game Health
- **Completion Rate:** `(Games Completed / Games Created) > 70%`
- **Average Game Duration:** `5-15 minutes` (too short = too easy, too long = frustration)
- **Guesses per Game:** `6-12 guesses` (indicates good difficulty balance)

### Technical Health
- **Lambda p95 Duration:** `< 500ms` for most functions
- **Error Rate:** `< 1%` of all requests
- **WebSocket Latency:** `< 500ms` for real-time updates

### Cost Efficiency
- **Cost per Game:** `< $0.01` (AI + Lambda combined)
- **Daily Cost:** `< $2` for low-medium traffic
- **Monthly Cost:** `< $60` projected

---

## 🔧 Troubleshooting Common Issues

### "No data" on AI metrics
**Problem:** `jotto.llm.*` metrics showing no data
**Fix:**
1. Check if `ANTHROPIC_API_KEY` is set in Lambda environment
2. Verify AI games are being played (not just human vs human)
3. Check CloudWatch logs for "AI Service initialized with Claude API"

### "No data" on WebSocket metrics
**Problem:** `jotto.websocket.*` metrics showing no data
**Fix:**
1. Temporarily disabled due to workspace dependency issues
2. Re-enable MetricsService in ws-*.ts files
3. Redeploy backend

### High Lambda costs
**Problem:** Lambda costs higher than expected
**Fix:**
1. Check for functions with high duration (optimize code)
2. Look for cold starts (consider provisioned concurrency)
3. Review memory allocation (256MB is default, may be too high)

### AI latency spikes
**Problem:** `jotto.llm.latency` showing high p99
**Fix:**
1. Check Anthropic API status page
2. Review prompt size (longer prompts = slower)
3. Consider implementing response caching for common patterns

---

## 📚 Related Documentation

- [LLM Observability Setup](./LLM_OBSERVABILITY.md)
- [Datadog Lambda Setup](./DATADOG_LAMBDA_SETUP.md)
- [Anthropic API Docs](https://docs.anthropic.com/en/api/getting-started)
- [AWS Lambda Pricing](https://aws.amazon.com/lambda/pricing/)

---

## 🎨 Dashboard Customization

### Add your own widgets:

**Example: Top Players by Games Won**
```json
{
  "title": "Top Players",
  "type": "toplist",
  "requests": [{
    "queries": [{
      "data_source": "metrics",
      "query": "sum:jotto.game.won{*}.as_count() by {player_id}"
    }]
  }]
}
```

**Example: Average Match Count per Guess**
```json
{
  "title": "Avg Letters Matched",
  "type": "query_value",
  "requests": [{
    "queries": [{
      "data_source": "metrics",
      "query": "avg:jotto.guess.match_count{*}"
    }]
  }]
}
```

---

## 🔗 Quick Links

- **Dashboard:** https://app.datadoghq.com/dashboard/lists
- **Logs:** https://app.datadoghq.com/logs?query=service:jotto-game
- **APM:** https://app.datadoghq.com/apm/services?env=production
- **Metrics Explorer:** https://app.datadoghq.com/metric/explorer

---

**Questions?** Check the [Datadog Documentation](https://docs.datadoghq.com/) or ask in #observability-help
