# Datadog Terraform Configuration for Jotto Game

Deploy Datadog dashboards, monitors, and SLOs as infrastructure-as-code.

## 📋 What This Creates

### Dashboard
- **26 widgets** across 6 sections (Game Engagement, AI Performance, Lambda, WebSocket, Errors, Costs)
- Real-time performance monitoring
- Cost tracking and projections

### Monitors (6 alerts)
1. **High Error Rate** - >10 errors in 5 minutes
2. **Lambda Function Failures** - >5 errors per function in 5 minutes
3. **AI Response Too Slow** - P95 latency >3 seconds
4. **High Daily AI Cost** - Daily cost >$5
5. **WebSocket Connection Issues** - >5 connection errors in 10 minutes
6. **No Activity** - No games created in 1 hour

### SLOs (2 objectives)
1. **Game Completion Rate** - Target: 70% of games completed
2. **API Response Time** - Target: 95% of requests <500ms

---

## 🚀 Quick Start

### 1. Prerequisites
- [Terraform](https://www.terraform.io/downloads) >= 1.0
- Datadog account (US5 region)
- Datadog API Key and Application Key

### 2. Get Datadog API Keys
1. Go to https://app.datadoghq.com/organization-settings/api-keys
2. Create or copy your **API Key**
3. Go to https://app.datadoghq.com/organization-settings/application-keys
4. Create or copy your **Application Key**

### 3. Configure
```bash
cd terraform/datadog
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:
```hcl
datadog_api_key = "your-actual-api-key-here"
datadog_app_key = "your-actual-app-key-here"
```

### 4. Deploy
```bash
# Initialize Terraform
terraform init

# Preview changes
terraform plan

# Apply configuration
terraform apply
```

### 5. Access Dashboard
After deployment, Terraform will output:
```
dashboard_url = "https://app.datadoghq.com/dashboard/xxx-xxx-xxx"
```

Click the URL or find it in: https://app.datadoghq.com/dashboard/lists

---

## 🔧 Configuration Options

### Environment Variables (Alternative to tfvars)
```bash
export TF_VAR_datadog_api_key="your-api-key"
export TF_VAR_datadog_app_key="your-app-key"
terraform apply
```

### Custom Alert Thresholds
Edit `terraform.tfvars`:
```hcl
alert_thresholds = {
  error_rate_critical    = 20  # Increase tolerance
  error_rate_warning     = 10
  lambda_errors_critical = 10
  lambda_errors_warning  = 5
  ai_latency_critical    = 5000  # 5 seconds
  ai_latency_warning     = 3000
  daily_cost_critical    = 10.0  # $10/day
  daily_cost_warning     = 7.0
}
```

### Disable Monitors (Dashboard Only)
```hcl
enable_monitors = false
enable_slos     = false
```

### Change Datadog Region
For US1 region:
```hcl
datadog_api_url = "https://api.datadoghq.com/"
```

For EU1 region:
```hcl
datadog_api_url = "https://api.datadoghq.eu/"
```

---

## 📊 Monitoring Integration

### Slack Notifications
1. Set up Datadog Slack integration: https://app.datadoghq.com/integrations/slack
2. Update `terraform.tfvars`:
```hcl
slack_channel = "@slack-jotto-alerts"
```

### PagerDuty Integration
1. Set up Datadog PagerDuty integration: https://app.datadoghq.com/integrations/pagerduty
2. Update `terraform.tfvars`:
```hcl
pagerduty_service = "@pagerduty-jotto-game"
```

### Customize Alert Recipients
Edit `main.tf` and modify the `message` field in each monitor:
```hcl
message = <<-EOT
  Alert message here

  @slack-your-channel
  @pagerduty-your-service
  @email-your-team@example.com
EOT
```

---

## 🔄 Updates and Changes

### Update Dashboard
1. Edit `../../datadog-dashboard.json`
2. Run `terraform apply`

### Update Monitors
1. Edit `main.tf` (modify monitor resources)
2. Run `terraform plan` to preview
3. Run `terraform apply`

### Add New Monitor
Add to `main.tf`:
```hcl
resource "datadog_monitor" "my_custom_monitor" {
  name    = "[Jotto] My Custom Alert"
  type    = "metric alert"
  message = "Alert description @slack-channel"
  query   = "avg(last_5m):metric{*} > threshold"

  monitor_thresholds {
    critical = 100
    warning  = 50
  }

  tags = [
    "service:jotto-game",
    "team:engineering"
  ]
}
```

---

## 🗑️ Cleanup

### Delete All Resources
```bash
terraform destroy
```

### Delete Specific Resource
```bash
# Delete just the dashboard
terraform destroy -target=datadog_dashboard_json.jotto_game_performance

# Delete specific monitor
terraform destroy -target=datadog_monitor.high_error_rate
```

---

## 📁 File Structure

```
terraform/datadog/
├── main.tf                      # Main configuration (dashboard, monitors, SLOs)
├── variables.tf                 # Input variables
├── terraform.tfvars.example     # Example configuration (copy to terraform.tfvars)
├── .gitignore                   # Prevent committing secrets
└── README.md                    # This file
```

---

## 🔍 Troubleshooting

### Error: Invalid API credentials
**Problem:** `Error: error retrieving user: 403 Forbidden`
**Fix:**
1. Verify API key is valid: https://app.datadoghq.com/organization-settings/api-keys
2. Verify App key is valid: https://app.datadoghq.com/organization-settings/application-keys
3. Check that keys have correct permissions

### Error: Dashboard already exists
**Problem:** Dashboard with same name already exists
**Fix:**
1. Option A: Import existing dashboard:
   ```bash
   terraform import datadog_dashboard_json.jotto_game_performance dashboard-id
   ```
2. Option B: Delete existing dashboard in Datadog UI and re-run

### Error: Monitor query invalid
**Problem:** Metric doesn't exist yet (no data sent)
**Fix:**
1. Deploy app and generate some traffic first
2. Verify metrics are flowing: https://app.datadoghq.com/metric/explorer
3. Search for `jotto.*` metrics

### No data in dashboard
**Problem:** Widgets showing "No data"
**Fix:**
1. Verify Lambda functions have Datadog instrumentation
2. Check `ANTHROPIC_API_KEY` is set for AI metrics
3. Play some games to generate data
4. Allow 2-3 minutes for metrics to appear

---

## 🔐 Security Best Practices

### ✅ DO:
- Store `terraform.tfvars` locally (in .gitignore)
- Use environment variables for CI/CD
- Rotate API keys regularly
- Use separate keys for dev/prod
- Store Terraform state remotely (S3 + DynamoDB)

### ❌ DON'T:
- Commit `terraform.tfvars` to git
- Share API keys in Slack/email
- Use production keys in development
- Hard-code keys in `main.tf`

### Remote State (Recommended for Teams)
Create `backend.tf`:
```hcl
terraform {
  backend "s3" {
    bucket         = "jotto-terraform-state"
    key            = "datadog/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-state-lock"
    encrypt        = true
  }
}
```

---

## 📚 Additional Resources

- [Datadog Terraform Provider Docs](https://registry.terraform.io/providers/DataDog/datadog/latest/docs)
- [Datadog Dashboard JSON Schema](https://docs.datadoghq.com/api/latest/dashboards/)
- [Datadog Monitor Configuration](https://docs.datadoghq.com/monitors/configuration/)
- [Terraform Best Practices](https://www.terraform.io/docs/cloud/guides/recommended-practices/index.html)

---

## 🎯 Next Steps

After deploying:

1. **Test Alerts**: Trigger a test alert to verify notifications work
   ```bash
   # Send test error metric
   aws lambda invoke --function-name JottoGameStackV2-MakeGuessFunction \
     --payload '{"test":"error"}' response.json
   ```

2. **Set Up Slack/PagerDuty**: Configure integrations for alert routing

3. **Create Custom Views**: Add team-specific dashboard widgets

4. **Set Up Anomaly Detection**: Use Datadog's ML-based alerts

5. **Configure Downtime Schedules**: Mute alerts during maintenance windows

---

## 💡 Tips

- **Start simple**: Deploy with default thresholds, tune over time
- **Monitor monitor noise**: If too many false positives, increase thresholds
- **Use tags**: Helps filter and group related resources
- **Document changes**: Add comments in `main.tf` for custom modifications
- **Test in staging**: Apply to staging environment first

---

**Questions?** Check the [main dashboard setup guide](../../DATADOG_DASHBOARD_SETUP.md) or Datadog docs.
