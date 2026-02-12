variable "datadog_api_key" {
  description = "Datadog API key"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.datadog_api_key) > 0
    error_message = "Datadog API key must be provided."
  }
}

variable "datadog_app_key" {
  description = "Datadog Application key"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.datadog_app_key) > 0
    error_message = "Datadog Application key must be provided."
  }
}

variable "datadog_api_url" {
  description = "Datadog API URL (us5.datadoghq.com for US5 region)"
  type        = string
  default     = "https://api.us5.datadoghq.com/"

  validation {
    condition     = can(regex("^https://.*datadoghq\\.com/?$", var.datadog_api_url))
    error_message = "Datadog API URL must be a valid Datadog API endpoint."
  }
}

variable "slack_channel" {
  description = "Slack channel for alert notifications (e.g., @slack-jotto-alerts)"
  type        = string
  default     = "@slack-jotto-alerts"
}

variable "pagerduty_service" {
  description = "PagerDuty service for critical alerts (e.g., @pagerduty-critical)"
  type        = string
  default     = "@pagerduty-critical"
}

variable "enable_monitors" {
  description = "Enable Datadog monitors (set to false to only create dashboard)"
  type        = bool
  default     = true
}

variable "enable_slos" {
  description = "Enable Service Level Objectives"
  type        = bool
  default     = true
}

variable "alert_thresholds" {
  description = "Custom alert thresholds"
  type = object({
    error_rate_critical     = number
    error_rate_warning      = number
    lambda_errors_critical  = number
    lambda_errors_warning   = number
    ai_latency_critical     = number
    ai_latency_warning      = number
    daily_cost_critical     = number
    daily_cost_warning      = number
  })
  default = {
    error_rate_critical    = 10
    error_rate_warning     = 5
    lambda_errors_critical = 5
    lambda_errors_warning  = 2
    ai_latency_critical    = 3000
    ai_latency_warning     = 2000
    daily_cost_critical    = 5.0
    daily_cost_warning     = 3.0
  }
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = list(string)
  default     = []
}
