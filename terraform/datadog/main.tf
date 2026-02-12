terraform {
  required_version = ">= 1.0"

  required_providers {
    datadog = {
      source  = "DataDog/datadog"
      version = "~> 3.38"
    }
  }
}

provider "datadog" {
  api_key = var.datadog_api_key
  app_key = var.datadog_app_key
  api_url = var.datadog_api_url
}

# Jotto Game Performance Dashboard
resource "datadog_dashboard_json" "jotto_game_performance" {
  dashboard = file("${path.module}/../../datadog-dashboard.json")
}

# Monitor: High Error Rate
resource "datadog_monitor" "high_error_rate" {
  name    = "[Jotto] High Error Rate"
  type    = "metric alert"
  message = <<-EOT
    **High error rate detected in Jotto game!**

    More than 10 errors occurred in the last 5 minutes.

    **Action Items:**
    1. Check recent deployments
    2. Review CloudWatch logs: https://console.aws.amazon.com/cloudwatch/
    3. Check error distribution by type in dashboard

    @slack-jotto-alerts
    @pagerduty-critical
  EOT

  query = "sum(last_5m):sum:jotto.error{*}.as_count() > 10"

  monitor_thresholds {
    critical = 10
    warning  = 5
  }

  notify_no_data    = false
  require_full_window = false
  notify_audit      = false
  timeout_h         = 0
  include_tags      = true
  priority          = 1

  tags = [
    "service:jotto-game",
    "team:engineering",
    "env:production",
    "severity:critical"
  ]
}

# Monitor: Lambda Function Failures
resource "datadog_monitor" "lambda_errors" {
  name    = "[Jotto] Lambda Function Failures"
  type    = "metric alert"
  message = <<-EOT
    **Lambda function {{functionname.name}} is experiencing errors!**

    More than 5 errors in the last 5 minutes.

    **Action Items:**
    1. Check CloudWatch logs for {{functionname.name}}
    2. Review recent code changes
    3. Check Lambda metrics in AWS Console

    @slack-jotto-alerts
  EOT

  query = "sum(last_5m):sum:aws.lambda.errors{service:jotto-game} by {functionname}.as_count() > 5"

  monitor_thresholds {
    critical = 5
    warning  = 2
  }

  notify_no_data    = false
  require_full_window = false
  notify_audit      = false
  timeout_h         = 0
  include_tags      = true
  priority          = 2

  tags = [
    "service:jotto-game",
    "team:engineering",
    "env:production",
    "severity:high"
  ]
}

# Monitor: AI Response Too Slow
resource "datadog_monitor" "ai_latency" {
  name    = "[Jotto] AI Response Too Slow"
  type    = "metric alert"
  message = <<-EOT
    **AI opponent responses are too slow!**

    P95 latency exceeded 3 seconds.

    **Action Items:**
    1. Check Anthropic API status: https://status.anthropic.com/
    2. Review recent LLM prompt changes
    3. Consider implementing response caching
    4. Check if Claude API rate limits are being hit

    @slack-jotto-alerts
  EOT

  query = "avg(last_10m):p95:jotto.llm.latency{*} > 3000"

  monitor_thresholds {
    critical = 3000
    warning  = 2000
  }

  notify_no_data    = false
  require_full_window = false
  notify_audit      = false
  timeout_h         = 0
  include_tags      = true
  priority          = 3

  tags = [
    "service:jotto-game",
    "team:engineering",
    "env:production",
    "severity:medium"
  ]
}

# Monitor: High Daily AI Cost
resource "datadog_monitor" "high_ai_cost" {
  name    = "[Jotto] High Daily AI Cost"
  type    = "metric alert"
  message = <<-EOT
    **AI costs are exceeding budget!**

    Daily AI API costs have exceeded $5.

    **Action Items:**
    1. Review token usage patterns in dashboard
    2. Check for unusual AI game traffic
    3. Consider implementing rate limiting
    4. Review prompt optimization opportunities

    Current daily cost: {{value}} USD

    @slack-jotto-alerts
  EOT

  query = "sum(last_1d):((sum:jotto.llm.tokens.input{*}.as_count() * 0.001 / 1000000) + (sum:jotto.llm.tokens.output{*}.as_count() * 0.005 / 1000000)) > 5"

  monitor_thresholds {
    critical = 5.0
    warning  = 3.0
  }

  notify_no_data    = false
  require_full_window = true
  notify_audit      = false
  timeout_h         = 24
  include_tags      = true
  priority          = 3

  tags = [
    "service:jotto-game",
    "team:engineering",
    "env:production",
    "severity:medium",
    "cost-alert:true"
  ]
}

# Monitor: WebSocket Connection Issues
resource "datadog_monitor" "websocket_errors" {
  name    = "[Jotto] WebSocket Connection Issues"
  type    = "metric alert"
  message = <<-EOT
    **WebSocket connections are failing!**

    More than 5 connection errors in the last 10 minutes.

    **Action Items:**
    1. Check API Gateway WebSocket API health
    2. Review CloudWatch logs for WebSocket handlers
    3. Check if Lambda functions are timing out
    4. Verify WEBSOCKET_API_ENDPOINT environment variable

    @slack-jotto-alerts
  EOT

  query = "sum(last_10m):sum:jotto.error{error_type:websocket_connect_error}.as_count() > 5"

  monitor_thresholds {
    critical = 5
    warning  = 3
  }

  notify_no_data    = false
  require_full_window = false
  notify_audit      = false
  timeout_h         = 0
  include_tags      = true
  priority          = 2

  tags = [
    "service:jotto-game",
    "team:engineering",
    "env:production",
    "severity:high"
  ]
}

# Monitor: No Activity (During Business Hours)
resource "datadog_monitor" "no_activity" {
  name    = "[Jotto] No Activity Detected"
  type    = "metric alert"
  message = <<-EOT
    **No games created in the past hour!**

    This might indicate the app is down or experiencing issues.

    **Action Items:**
    1. Check if CloudFront distribution is healthy
    2. Verify Lambda functions are responding
    3. Check recent deployments for issues
    4. Test creating a game manually

    @slack-jotto-alerts
  EOT

  query = "sum(last_1h):sum:jotto.game.created{*}.as_count() < 1"

  monitor_thresholds {
    critical = 1
  }

  # Only alert during business hours (9am-9pm ET)
  silenced = {}

  notify_no_data    = false
  require_full_window = true
  notify_audit      = false
  timeout_h         = 1
  include_tags      = true
  priority          = 2

  tags = [
    "service:jotto-game",
    "team:engineering",
    "env:production",
    "severity:high"
  ]
}

# SLO: Game Completion Success Rate
resource "datadog_service_level_objective" "game_completion_rate" {
  name        = "Jotto Game Completion Rate"
  type        = "metric"
  description = "Percentage of games that are successfully completed (not abandoned)"

  query {
    numerator   = "sum:jotto.game.completed{*}.as_count()"
    denominator = "sum:jotto.game.created{*}.as_count()"
  }

  thresholds {
    timeframe = "7d"
    target    = 70.0
    warning   = 60.0
  }

  thresholds {
    timeframe = "30d"
    target    = 70.0
    warning   = 60.0
  }

  tags = [
    "service:jotto-game",
    "team:engineering",
    "env:production"
  ]
}

# SLO: API Response Time
resource "datadog_service_level_objective" "api_response_time" {
  name        = "Jotto API Response Time (P95)"
  type        = "metric"
  description = "95th percentile of Lambda function duration should be under 500ms"

  query {
    numerator   = "sum:aws.lambda.duration{service:jotto-game,functionname:*makeguess*}.as_count().rollup(count)"
    denominator = "sum:aws.lambda.duration{service:jotto-game,functionname:*makeguess*}.as_count().rollup(count)"
  }

  thresholds {
    timeframe = "7d"
    target    = 95.0
    warning   = 90.0
  }

  thresholds {
    timeframe = "30d"
    target    = 95.0
    warning   = 90.0
  }

  tags = [
    "service:jotto-game",
    "team:engineering",
    "env:production"
  ]
}

# Output dashboard URL
output "dashboard_url" {
  value       = datadog_dashboard_json.jotto_game_performance.dashboard_url
  description = "URL to the Jotto Game Performance Dashboard"
}

# Output monitor IDs
output "monitor_ids" {
  value = {
    high_error_rate       = datadog_monitor.high_error_rate.id
    lambda_errors         = datadog_monitor.lambda_errors.id
    ai_latency           = datadog_monitor.ai_latency.id
    high_ai_cost         = datadog_monitor.high_ai_cost.id
    websocket_errors     = datadog_monitor.websocket_errors.id
    no_activity          = datadog_monitor.no_activity.id
  }
  description = "Map of monitor names to their IDs"
}

# Output SLO IDs
output "slo_ids" {
  value = {
    game_completion_rate = datadog_service_level_objective.game_completion_rate.id
    api_response_time    = datadog_service_level_objective.api_response_time.id
  }
  description = "Map of SLO names to their IDs"
}
