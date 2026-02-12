# LLM Observability with Datadog

This document describes the LLM-powered AI implementation with Datadog LLM Observability for the Jotto game.

## Overview

The Jotto game AI opponent has been upgraded from a rule-based algorithm to an LLM-powered system using Claude 3.5 Haiku. This provides:

- **Smarter gameplay**: Claude uses strategic reasoning to make intelligent guesses
- **Graceful fallback**: Falls back to rule-based strategy if LLM is unavailable
- **Full observability**: Tracks token usage, latency, costs, and performance

## Architecture

### AIService Implementation

**Model**: Claude 3.5 Haiku (`claude-3-5-haiku-20241022`)
- Fast inference (~500-1500ms including delay)
- Cost-effective ($0.25/MTok input, $1.25/MTok output)
- Perfect for this use case (short prompts, simple responses)

**Key Features**:
1. **LLM-Powered Strategy**: Claude analyzes game history and makes strategic guesses
2. **Validation**: Ensures guesses are valid 5-letter words from the word list
3. **Fallback**: Automatically uses rule-based strategy if LLM fails or is unavailable
4. **Natural Timing**: Adds 500-1500ms delay for realistic gameplay

### Metrics Tracked

The AIService tracks comprehensive metrics via `MetricsService`:

#### LLM Metrics
- `jotto.llm.tokens.input` - Input tokens per request (tagged with model)
- `jotto.llm.tokens.output` - Output tokens per request (tagged with model)
- `jotto.llm.latency` - Time to generate response (tagged with model, success)

#### AI Performance Metrics
- `jotto.ai.move.duration` - Total time to make AI move (including delay)
- `jotto.ai.move.duration` (tagged with quality: optimal/suboptimal)

#### Error Metrics
- `jotto.error` (tagged with error_type: ai_move_error)

## Setup

### 1. Get Anthropic API Key

1. Sign up at https://console.anthropic.com/
2. Generate an API key
3. Store it securely (never commit to git)

### 2. Set Environment Variable

**Local Development**:
```bash
export ANTHROPIC_API_KEY="your-api-key-here"
```

**CDK Deployment**:
```bash
export ANTHROPIC_API_KEY="your-api-key-here"
cd infrastructure
npx cdk deploy --all
```

The CDK stack reads `process.env.ANTHROPIC_API_KEY` and passes it to all Lambda functions.

### 3. Verify Setup

Check CloudWatch Logs for Lambda functions:
- Look for: `"AI Service initialized with Claude API"` ✅
- Or: `"ANTHROPIC_API_KEY not set - AI will use fallback strategy"` ⚠️

## Monitoring in Datadog

### Dashboards

Create custom dashboards in Datadog to visualize:

**LLM Performance**:
- Token usage over time
- Average latency per request
- Cost per game (calculate from token usage)
- Success rate

**AI Gameplay**:
- Games played (human vs AI)
- AI win rate
- Average guesses to win
- LLM vs fallback strategy usage

### Example Queries

**Average tokens per game**:
```
avg:jotto.llm.tokens.input{service:jotto-game}
avg:jotto.llm.tokens.output{service:jotto-game}
```

**LLM latency percentiles**:
```
p50:jotto.llm.latency{model:claude-3-5-haiku-20241022,success:true}
p95:jotto.llm.latency{model:claude-3-5-haiku-20241022,success:true}
p99:jotto.llm.latency{model:claude-3-5-haiku-20241022,success:true}
```

**Cost estimation** (based on token usage):
```
# Input cost: $0.25 per MTok (1M tokens)
sum:jotto.llm.tokens.input{*} * 0.25 / 1000000

# Output cost: $1.25 per MTok
sum:jotto.llm.tokens.output{*} * 1.25 / 1000000
```

**AI move quality**:
```
count:jotto.ai.move.duration{quality:optimal}
count:jotto.ai.move.duration{quality:suboptimal}
```

### Alerts

Set up alerts for:

1. **High LLM error rate**: Alert if >10% of LLM requests fail
2. **High latency**: Alert if p95 latency >5 seconds
3. **Unexpected costs**: Alert if daily token usage exceeds threshold
4. **Fallback overuse**: Alert if fallback strategy used >50% of the time

## Cost Estimation

**Claude 3.5 Haiku Pricing**:
- Input: $0.25 per MTok (million tokens)
- Output: $1.25 per MTok

**Typical Usage per Game**:
- ~150 input tokens per guess (prompt + history)
- ~10 output tokens per guess (single word response)
- ~5-10 guesses per game

**Cost per Game**: ~$0.001 (0.1 cents)
**Cost per 1000 Games**: ~$1.00

Very affordable for production use!

## Testing

### Test with LLM
```bash
# Set API key
export ANTHROPIC_API_KEY="your-api-key"

# Deploy
cd infrastructure
AWS_PROFILE=account-admin-148203325623 npx cdk deploy --all

# Play game via frontend
# Create AI game and observe:
# - Check CloudWatch logs for "LLM guess generated"
# - Check Datadog for jotto.llm.* metrics
```

### Test Fallback
```bash
# Deploy without API key
unset ANTHROPIC_API_KEY
cd infrastructure
AWS_PROFILE=account-admin-148203325623 npx cdk deploy --all

# Play game via frontend
# Check CloudWatch logs for "ANTHROPIC_API_KEY not set"
# AI will still work using rule-based strategy
```

## Prompt Engineering

The current prompt is optimized for Jotto gameplay:

```
You are playing Jotto, a word game where you guess a 5-letter secret word.
After each guess, you learn how many letters match (same letter, same position).

VALID WORDS: You must choose from common 5-letter English words like: ...

YOUR PREVIOUS GUESSES:
ABOUT: 1 matches
CLAIM: 2 matches

STRATEGY:
- Use the match counts to eliminate impossible words
- Pick words that test different letters
- Avoid repeating guesses
- Choose common English words

Respond with ONLY a single 5-letter word in UPPERCASE, nothing else.

Your next guess:
```

**Key Design Decisions**:
1. **Low temperature (0.3)**: Consistent, strategic play
2. **Small max_tokens (100)**: Only need a single word
3. **Clear constraints**: Must be valid word from list
4. **Context-aware**: Includes previous guess history
5. **Structured output**: Single word, uppercase

## Future Enhancements

1. **Personality**: Add conversational elements ("Nice guess!", "This one's tricky")
2. **Difficulty levels**: Adjust temperature/strategy based on user preference
3. **Multi-model**: A/B test different models (Haiku vs Sonnet)
4. **Prompt optimization**: Use prompt engineering to improve win rate
5. **Caching**: Cache common game states to reduce API calls
6. **Batch processing**: Process multiple AI moves in parallel

## Troubleshooting

### Issue: AI not using LLM

**Symptoms**:
- Logs show "AI will use fallback strategy"
- No `jotto.llm.*` metrics in Datadog

**Solutions**:
1. Check ANTHROPIC_API_KEY is set in environment
2. Verify API key is valid at https://console.anthropic.com/
3. Check CloudWatch logs for detailed error messages
4. Ensure Lambda has internet access (not in VPC without NAT)

### Issue: High LLM error rate

**Symptoms**:
- Many "LLM guess generation failed" logs
- Metrics show low success rate

**Solutions**:
1. Check Anthropic API status: https://status.anthropic.com/
2. Verify API key has sufficient credits
3. Check for rate limiting (unlikely with these volumes)
4. Review CloudWatch logs for specific error messages

### Issue: Invalid guesses

**Symptoms**:
- Logs show "LLM generated invalid guess, using fallback"
- AI makes seemingly random moves

**Solutions**:
1. Check word list includes common words
2. Verify prompt includes sufficient examples
3. Consider adjusting temperature (currently 0.3)
4. Add more validation logic if needed

## Security Notes

- **API Key Protection**: Never commit ANTHROPIC_API_KEY to git
- **Environment Variables**: Use AWS Secrets Manager for production
- **Cost Controls**: Set up billing alerts in Anthropic console
- **Rate Limiting**: Monitor usage to avoid unexpected bills
- **Access Control**: Restrict API key permissions to Messages API only

## Resources

- Anthropic API Docs: https://docs.anthropic.com/
- Claude Models: https://docs.anthropic.com/en/docs/about-claude/models
- Datadog LLM Observability: https://docs.datadoghq.com/llm_observability/
- Pricing: https://www.anthropic.com/pricing
