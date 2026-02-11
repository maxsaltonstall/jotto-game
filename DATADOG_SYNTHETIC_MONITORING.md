# Datadog Synthetic Monitoring for Jotto Game

## Overview

Set up automated tests that run every few minutes to ensure your Jotto game is working correctly, with alerts when things break.

## What You'll Monitor

1. **API Endpoints** - Verify backend is responding
2. **AI Game Creation** - Test the broken flow you're experiencing
3. **Full Game Flow** - Create game → Join → Make guess → Check state
4. **Frontend Uptime** - Ensure website is accessible

## Setup Guide

### 1. API Test: AI Game Creation

This tests the exact endpoint that's causing issues.

**Go to**: https://us5.datadoghq.com/synthetics/create

**Configure API Test**:

```
Test Type: HTTP
Name: Jotto - Create AI Game
URL: https://cxa2b8e6b2.execute-api.us-east-1.amazonaws.com/prod/ai-game
Method: POST

Headers:
  Content-Type: application/json

Body (JSON):
{
  "playerId": "synthetic-test",
  "playerName": "Datadog Monitor",
  "secretWord": "TESTS"
}

Assertions:
  ✓ Status code is 200
  ✓ Response time is less than 2000 ms
  ✓ Response body contains "gameId"
  ✓ Response body contains "isAiGame"
  ✓ Response body contains "AI_PLAYER"

Locations: Run from 3-5 locations (US East, US West, EU)
Frequency: Every 5 minutes
Alert: Notify if fails 2 times in a row
```

**Why This Helps**:
- Detects if AI game creation breaks
- Alerts you before users complain
- Shows you exact API response times
- Tracks uptime over time

### 2. API Test: List Games

Test the most frequently used endpoint.

```
Test Type: HTTP
Name: Jotto - List Waiting Games
URL: https://cxa2b8e6b2.execute-api.us-east-1.amazonaws.com/prod/games?status=WAITING
Method: GET

Assertions:
  ✓ Status code is 200
  ✓ Response time is less than 1000 ms
  ✓ Response body contains "games"

Locations: US East, US West
Frequency: Every 5 minutes
```

### 3. API Test: Full Game Flow (Multistep)

Test complete game workflow in sequence.

**Go to**: https://us5.datadoghq.com/synthetics/create → **Multistep API test**

```
Name: Jotto - Full Game Flow

Step 1: Create Game
  POST /prod/games
  Body: {"playerId":"test1","playerName":"Player1","secretWord":"CHARM"}
  Extract: gameId from response.game.gameId

Step 2: Join Game
  POST /prod/games/{{ gameId }}/join
  Body: {"playerId":"test2","playerName":"Player2","secretWord":"CLOUD"}
  Assert: Status 200

Step 3: Make Guess
  POST /prod/games/{{ gameId }}/guess
  Body: {"playerId":"test1","guess":"CLOUD"}
  Assert: Response contains "result"

Step 4: Get Game State
  GET /prod/games/{{ gameId }}?playerId=test1
  Assert: Status 200
  Assert: Body contains "ACTIVE" or "COMPLETED"

Frequency: Every 15 minutes
Alert: Notify if fails
```

### 4. Browser Test: AI Game (Full UI Test)

Test the actual user experience in a real browser.

**Go to**: https://us5.datadoghq.com/synthetics/browser/create

```
Name: Jotto - Create AI Game (Browser)
Starting URL: https://jotto.maxsaltonstall.com

Steps:
1. Go to URL
2. Assert: Page contains "Jotto"
3. Type "SYNTH" in input[id="aiSecretWord"]
4. Click button with text "Start AI Game"
5. Wait 2 seconds
6. Assert: Page contains "AI Bot 🤖"
7. Assert: URL contains "/game/"

Frequency: Every 15 minutes
Locations: US East, EU
Alert: Notify on failure
Screenshot: Capture on failure
```

**Why Browser Tests Are Better**:
- Tests the ACTUAL user experience
- Catches JavaScript errors
- Catches CSS/UI issues
- Catches browser caching problems
- Takes screenshots when it fails

### 5. Simple Uptime Check

Monitor if your site is accessible.

```
Test Type: HTTP
Name: Jotto - Frontend Uptime
URL: https://jotto.maxsaltonstall.com
Method: GET

Assertions:
  ✓ Status code is 200
  ✓ Response time is less than 1000 ms
  ✓ Response body contains "Jotto"

Locations: 5 locations worldwide
Frequency: Every 1 minute
Alert: Notify immediately on failure
```

## Setting Up Alerts

### Create Alert Rules

For each test, configure notifications:

**Alert Conditions**:
```
Trigger alert when:
  Test fails from 2 or more locations
  OR
  Test fails 2 consecutive times

Recovery notification:
  Send when test passes again
```

**Notification Channels**:
1. **Email**: Your email address
2. **Slack** (optional): Create Slack webhook
3. **PagerDuty** (optional): For critical alerts

### Alert Message Template

```
Subject: {{test.name}} is {{test.status}}

Message:
🚨 Synthetic test failed!

Test: {{test.name}}
Status: {{test.status}}
Location: {{test.location}}
Time: {{test.timestamp}}

Failure reason: {{test.failure_message}}

View test: {{test.url}}
View logs: https://us5.datadoghq.com/logs?query=service:jotto-game

Click to investigate →
```

## Quick Setup via Datadog UI

### Step-by-Step:

1. **Go to**: https://us5.datadoghq.com/synthetics/tests

2. **Click**: "New Test" → "HTTP Test"

3. **Enter**:
   - Name: `Jotto - Create AI Game`
   - URL: `https://cxa2b8e6b2.execute-api.us-east-1.amazonaws.com/prod/ai-game`
   - Method: `POST`

4. **Click**: "Define request" → Add headers:
   ```
   Content-Type: application/json
   ```

5. **Body**:
   ```json
   {
     "playerId": "synthetic-test",
     "playerName": "Datadog Monitor",
     "secretWord": "TESTS"
   }
   ```

6. **Add Assertions**:
   - Click "+ Assertion"
   - Status Code → is → 200
   - Response time → is less than → 2000 ms
   - Response body → contains → "gameId"
   - Response body → contains → "AI_PLAYER"

7. **Configure Locations**:
   - Select 3-5 test locations
   - Suggested: N. Virginia, Oregon, Frankfurt

8. **Set Frequency**: Every 5 minutes

9. **Alert Conditions**:
   - Alert after: 2 failures
   - Locations: At least 2 locations

10. **Notifications**:
    - Add your email
    - Add Slack channel (optional)

11. **Click**: "Create Test"

## Monitoring Dashboard

Create a dashboard to visualize all synthetic tests:

**Go to**: https://us5.datadoghq.com/dashboard/lists

**Create Dashboard**:

```yaml
Name: Jotto Game - Synthetic Monitoring

Widgets:

1. Uptime Percentage (Last 30 days)
   - Metric: synthetics.http.response.code
   - Filter: test.name:Jotto*
   - Type: Query Value
   - Display: Uptime %

2. API Response Times
   - Metric: synthetics.http.response.time
   - Filter: service:jotto-game
   - Type: Timeseries
   - Display: P50, P95, P99

3. Test Status Overview
   - Metric: synthetics.test.runs
   - Group by: test.name, test.status
   - Type: Top List
   - Display: Pass/Fail count

4. Geographic Performance
   - Metric: synthetics.http.response.time
   - Group by: location
   - Type: Heatmap

5. Recent Failures (if any)
   - Query: source:synthetics status:error
   - Type: Log Stream
   - Display: Last 10 failures
```

## What Each Test Catches

| Test | Catches |
|------|---------|
| API - Create AI Game | Backend Lambda errors, DynamoDB issues, AI service failures |
| API - List Games | Database query issues, pagination bugs |
| API - Full Flow | Integration issues, state management bugs |
| Browser - Create AI | Frontend bugs, JavaScript errors, CSS issues, cache problems |
| Uptime Check | CloudFront issues, S3 bucket problems, DNS failures |

## Expected Results

**Healthy System**:
- All tests: ✅ Passing
- API response time: < 500ms (P95)
- Browser test: < 3 seconds
- Uptime: > 99.5%

**Alerts You'll Receive**:
- "AI game creation failing" → Backend issue
- "Browser test timeout" → Frontend/caching issue
- "Response time > 2s" → Performance degradation
- "Status code 500" → Lambda error

## Cost Estimate

Datadog Synthetic Monitoring pricing (approximate):

- API Tests: ~$5/month per test (at 5 min frequency)
- Browser Tests: ~$12/month per test (at 15 min frequency)

**Recommended Setup** (~$20-30/month):
- 2 API tests (Create AI Game, List Games)
- 1 Multistep API test (Full flow)
- 1 Browser test (AI game creation)
- 1 Uptime check

## Next Steps

1. ✅ Create "Create AI Game" API test first
2. ✅ Set up email alerts
3. ✅ Wait 30 minutes, check if it passes
4. ✅ Add Browser test for full validation
5. ✅ Create dashboard to monitor all tests

## Troubleshooting

### Test Keeps Failing

**If API test fails**:
1. Check CloudWatch logs for Lambda errors
2. Verify API Gateway is healthy
3. Check DynamoDB throttling metrics

**If Browser test fails**:
1. Look at screenshot (Datadog captures it automatically)
2. Check browser console logs in test results
3. Verify CloudFront cache is serving latest code

### Test Passes But Users Report Issues

- Add more assertions to catch edge cases
- Test from more geographic locations
- Add variable test data (different secret words)
- Test with authentication (if applicable)

## Advanced: Test with Variables

Use Datadog variables for dynamic testing:

```javascript
// Create test with random game data
const testWords = ['CHARM', 'CLOUD', 'HEART', 'BRAIN', 'STORM'];
const randomWord = testWords[Math.floor(Math.random() * testWords.length)];

// Use in API test body
{
  "playerId": "test-{{ timestamp }}",
  "playerName": "Tester",
  "secretWord": "{{ randomWord }}"
}
```

## Summary

**Set Up Today**:
1. Go to https://us5.datadoghq.com/synthetics/tests
2. Create "Jotto - Create AI Game" HTTP test
3. Set frequency to 5 minutes
4. Add your email to alerts
5. Let it run for 24 hours

**Tomorrow**:
- Check test history
- Verify you received test results
- Add browser test if API test is stable

**This Week**:
- Create full game flow test
- Build monitoring dashboard
- Set up Slack notifications

You'll never wonder if your game is broken again! 🎯
