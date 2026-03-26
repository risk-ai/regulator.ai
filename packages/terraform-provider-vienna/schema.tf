# Vienna OS Terraform Provider — Schema Reference
# This defines the resources and data sources available in the Vienna OS Terraform provider
# Version: 1.0.0

terraform {
  required_providers {
    vienna = {
      source  = "regulator.ai/vienna"
      version = "~> 1.0"
    }
  }
}

# Configure the Vienna OS provider
provider "vienna" {
  # Vienna OS API endpoint
  endpoint = "https://api.regulator.ai"
  
  # Authentication via API key (recommended for CI/CD)
  api_key = var.vienna_api_key
  
  # Alternative: JWT token authentication
  # access_token = var.vienna_access_token
  
  # Tenant context (auto-detected from credentials if not specified)
  tenant_id = var.vienna_tenant_id
  
  # Optional: Custom user agent
  user_agent = "Terraform/1.5.0 Vienna-Provider/1.0.0"
  
  # Optional: Request timeout
  timeout = "30s"
  
  # Optional: Retry configuration
  retry {
    attempts = 3
    delay    = "5s"
  }
}

# ===== RESOURCES =====

# vienna_policy: Governance policy management
resource "vienna_policy" "file_size_limit" {
  name        = "File Size Limit Policy"
  description = "Prevent agents from processing files larger than 100MB"
  
  # Policy evaluation priority (1-1000, higher = evaluated first)
  priority = 100
  
  # Policy conditions (all must match)
  conditions = [
    {
      field    = "action"
      operator = "equals"
      value    = "file.read"
    },
    {
      field    = "params.file_size"
      operator = "greater_than" 
      value    = 104857600 # 100MB in bytes
    }
  ]
  
  # Actions to take when conditions match
  actions = [
    {
      type    = "deny"
      message = "File size exceeds 100MB limit. Use file.stream for large files."
    },
    {
      type = "log"
      message = "Large file access blocked by policy"
    }
  ]
  
  # Policy state
  enabled = true
  
  # Metadata
  tags = {
    environment = "production"
    category    = "security"
    compliance  = "data-protection"
  }
}

# Business hours restriction policy  
resource "vienna_policy" "business_hours_approval" {
  name        = "Business Hours Approval Required"
  description = "Require additional approval for T2+ actions outside business hours"
  priority    = 200
  
  conditions = [
    {
      field    = "risk_tier"
      operator = "in"
      value    = ["T2", "T3"]
    },
    {
      field    = "time.hour"
      operator = "not_between"
      value    = [9, 17] # 9 AM to 5 PM
    }
  ]
  
  actions = [
    {
      type      = "require_approval"
      approvers = 2
      message   = "High-risk action outside business hours requires additional approval"
    }
  ]
  
  enabled = true
  
  tags = {
    environment = "production"
    category    = "temporal"
    team        = "security-ops"
  }
}

# Rate limiting policy
resource "vienna_policy" "agent_rate_limit" {
  name        = "Agent Rate Limiting"
  description = "Limit agent intent submission rate to prevent abuse"
  priority    = 50
  
  conditions = [
    {
      field    = "agent_id"
      operator = "regex"
      value    = "^agent_batch_.*" # Target batch processing agents
    }
  ]
  
  actions = [
    {
      type = "rate_limit"
      rate = {
        requests    = 100
        window      = "1m" # per minute
        burst_size  = 20   # burst allowance
      }
      message = "Batch agent rate limited to 100 requests/minute"
    }
  ]
  
  enabled = true
}

# vienna_action_type: Define custom action types with validation
resource "vienna_action_type" "database_migration" {
  name         = "database.migration"
  description  = "Execute database schema migrations"
  category     = "data-management"
  risk_tier    = "T3" # High risk by default
  
  # Parameter schema (JSON Schema format)
  parameter_schema = jsonencode({
    type = "object"
    required = ["migration_file", "target_version"]
    properties = {
      migration_file = {
        type        = "string"
        pattern     = "^\\/migrations\\/.*\\.sql$"
        description = "Path to migration SQL file"
      }
      target_version = {
        type        = "integer"
        minimum     = 1
        description = "Target schema version"
      }
      dry_run = {
        type        = "boolean"
        default     = true
        description = "Execute as dry run first"
      }
      backup_table = {
        type        = "boolean" 
        default     = true
        description = "Create backup before migration"
      }
    }
  })
  
  # Validation rules
  validation_rules = [
    {
      type    = "require_approval"
      count   = 2
      message = "Database migrations require dual approval"
    },
    {
      type    = "time_restriction"
      windows = ["02:00-04:00"] # Only during maintenance window
      message = "Migrations only allowed during maintenance window (2-4 AM)"
    }
  ]
  
  # Execution constraints
  execution_constraints = {
    max_duration_minutes = 60
    require_warrant     = true
    audit_level        = "detailed"
  }
  
  tags = {
    team        = "data-engineering"
    criticality = "high"
  }
}

# File processing action type
resource "vienna_action_type" "file_processing" {
  name        = "file.process"
  description = "Process files with validation and safety checks"
  category    = "file-management"
  risk_tier   = "T1" # Low-medium risk
  
  parameter_schema = jsonencode({
    type = "object"
    required = ["input_path", "operation"]
    properties = {
      input_path = {
        type        = "string"
        pattern     = "^/data/(input|temp)/.*"
        description = "Input file path (restricted to safe directories)"
      }
      output_path = {
        type        = "string"
        pattern     = "^/data/output/.*"
        description = "Output file path"
      }
      operation = {
        type = "string"
        enum = ["transform", "validate", "compress", "encrypt"]
      }
      max_file_size = {
        type    = "integer"
        maximum = 1073741824 # 1GB limit
        default = 104857600  # 100MB default
      }
    }
  })
  
  validation_rules = [
    {
      type    = "file_scan"
      message = "Files must pass malware scan"
    }
  ]
  
  execution_constraints = {
    max_duration_minutes = 30
    require_warrant     = true
    audit_level        = "standard"
  }
}

# vienna_agent: Register and manage agents
resource "vienna_agent" "data_processor" {
  agent_id    = "agent_data_processor_prod"
  name        = "Data Processing Agent"
  description = "Handles ETL operations and data transformations"
  framework   = "openclaw"
  
  # Agent capabilities
  capabilities = [
    "file.read",
    "file.write", 
    "file.process",
    "database.query",
    "api.call"
  ]
  
  # Agent configuration
  config = {
    max_concurrent_tasks = 5
    timeout_minutes     = 60
    retry_attempts      = 3
    
    # Resource limits
    memory_limit_gb = 4
    cpu_limit_cores = 2
    
    # Data access restrictions
    allowed_data_paths = [
      "/data/input/*",
      "/data/temp/*", 
      "/data/output/*"
    ]
    
    blocked_data_paths = [
      "/data/sensitive/*",
      "/etc/*",
      "/sys/*"
    ]
  }
  
  # Health check configuration
  health_check = {
    interval_seconds = 30
    timeout_seconds  = 10
    failure_threshold = 3
  }
  
  # Auto-scaling settings
  scaling = {
    enabled     = true
    min_instances = 1
    max_instances = 10
    
    scale_up_threshold = {
      metric = "cpu_usage"
      value  = 80 # Scale up at 80% CPU
    }
    
    scale_down_threshold = {
      metric = "cpu_usage"
      value  = 20 # Scale down at 20% CPU
    }
  }
  
  tags = {
    team        = "data-engineering"
    environment = "production"
    cost_center = "engineering"
  }
}

# ML training agent
resource "vienna_agent" "ml_trainer" {
  agent_id     = "agent_ml_trainer"
  name         = "ML Model Training Agent"
  description  = "Trains and evaluates machine learning models"
  framework    = "langchain"
  
  capabilities = [
    "model.train",
    "model.evaluate", 
    "data.load",
    "compute.gpu"
  ]
  
  config = {
    max_concurrent_tasks = 2 # GPU-intensive, limit concurrency
    timeout_minutes     = 1440 # 24 hours for large models
    
    # GPU requirements
    gpu_required = true
    gpu_memory_gb = 16
    
    # Model storage
    model_registry_path = "/models/registry"
    checkpoint_path     = "/models/checkpoints"
  }
  
  health_check = {
    interval_seconds = 60
    timeout_seconds  = 30
    failure_threshold = 3
  }
  
  tags = {
    team = "ml-engineering"
    gpu  = "required"
  }
}

# vienna_integration: External system integrations
resource "vienna_integration" "slack_notifications" {
  name         = "Slack Incident Notifications" 
  type         = "webhook"
  description  = "Send critical alerts to Slack channel"
  
  # Integration configuration
  config = {
    webhook_url = var.slack_webhook_url
    channel     = "#vienna-alerts"
    username    = "Vienna OS"
    icon_emoji  = ":robot_face:"
    
    # Message templating
    message_template = jsonencode({
      text = "Vienna OS Alert"
      attachments = [
        {
          color  = "{{if eq .severity \"critical\"}}danger{{else}}warning{{end}}"
          title  = "{{.event_type}}"
          text   = "{{.message}}"
          fields = [
            {
              title = "Agent ID"
              value = "{{.agent_id}}"
              short = true
            },
            {
              title = "Timestamp"
              value = "{{.timestamp}}"
              short = true
            }
          ]
        }
      ]
    })
  }
  
  # Event filters
  event_filters = [
    {
      event_type = "agent.offline"
      severity   = "critical"
    },
    {
      event_type = "execution.failed"
      severity   = "warning"
    },
    {
      event_type = "policy.violation"
      severity   = "critical"
    }
  ]
  
  # Delivery settings
  delivery = {
    retry_attempts = 3
    retry_delay    = "5s"
    timeout        = "10s"
  }
  
  enabled = true
  
  tags = {
    type = "notification"
    team = "platform"
  }
}

# Email notification integration
resource "vienna_integration" "email_alerts" {
  name        = "Email Alert System"
  type        = "email"
  description = "Email notifications for high-priority events"
  
  config = {
    smtp_host     = "smtp.company.com"
    smtp_port     = 587
    smtp_username = var.smtp_username
    smtp_password = var.smtp_password
    from_address  = "vienna@company.com"
    from_name     = "Vienna OS Platform"
    
    # Default recipients
    default_recipients = [
      "platform-team@company.com",
      "security@company.com"
    ]
    
    # Email templates
    templates = {
      subject = "Vienna OS Alert: {{.event_type}}"
      body = <<-EOF
        Vienna OS Alert
        
        Event: {{.event_type}}
        Severity: {{.severity}}
        Agent: {{.agent_id}}
        Time: {{.timestamp}}
        
        Details:
        {{.message}}
        
        --
        Vienna OS Platform
      EOF
    }
  }
  
  event_filters = [
    {
      event_type = "agent.offline"
      severity   = "critical"
      recipients = ["oncall@company.com"]
    },
    {
      event_type = "policy.violation"
      severity   = "critical"
    }
  ]
  
  enabled = true
}

# Monitoring integration (Datadog)
resource "vienna_integration" "datadog_metrics" {
  name        = "Datadog Metrics Export"
  type        = "metrics" 
  description = "Export Vienna OS metrics to Datadog"
  
  config = {
    api_key = var.datadog_api_key
    site    = "datadoghq.com"
    
    # Metric configuration
    metric_prefix = "vienna_os"
    
    # Tags to apply to all metrics
    default_tags = [
      "environment:production",
      "service:vienna-os",
      "team:platform"
    ]
    
    # Export settings
    batch_size     = 100
    flush_interval = "30s"
    
    # Metric filters
    include_metrics = [
      "intent.submitted",
      "intent.approved", 
      "intent.denied",
      "execution.completed",
      "agent.heartbeat",
      "policy.triggered"
    ]
  }
  
  enabled = true
}

# ===== DATA SOURCES =====

# vienna_fleet_status: Get fleet-wide agent status
data "vienna_fleet_status" "all_agents" {
  # Optional filters
  filters = {
    framework = ["openclaw", "langchain"] # Only specific frameworks
    status    = ["healthy", "degraded"]   # Exclude offline agents
    tags = {
      environment = "production"
    }
  }
  
  # Include detailed metrics
  include_metrics = true
  
  # Age threshold for "recent" data
  max_age_minutes = 5
}

# Access the data
output "fleet_summary" {
  value = {
    total_agents    = data.vienna_fleet_status.all_agents.total_count
    healthy_agents  = data.vienna_fleet_status.all_agents.healthy_count
    degraded_agents = data.vienna_fleet_status.all_agents.degraded_count
    offline_agents  = data.vienna_fleet_status.all_agents.offline_count
    
    # Recent activity
    intents_last_hour   = data.vienna_fleet_status.all_agents.metrics.intents_last_hour
    executions_last_hour = data.vienna_fleet_status.all_agents.metrics.executions_last_hour
    
    # Agent details
    agents = data.vienna_fleet_status.all_agents.agents
  }
}

# vienna_audit_log: Query audit logs
data "vienna_audit_log" "recent_incidents" {
  # Time range
  from = timeadd(timestamp(), "-24h") # Last 24 hours
  to   = timestamp()
  
  # Event type filters
  event_types = [
    "intent.denied",
    "execution.failed", 
    "agent.offline",
    "policy.violation"
  ]
  
  # Severity filter
  min_severity = "warning"
  
  # Agent filters
  agent_filters = {
    framework = "openclaw"
    # Exclude test agents
    exclude_agent_ids = ["agent_test_*"]
  }
  
  # Results configuration  
  limit = 100
  order = "desc" # Most recent first
}

# Process audit results
output "incident_summary" {
  value = {
    total_incidents = length(data.vienna_audit_log.recent_incidents.events)
    
    # Group by event type
    by_type = {
      for event_type in ["intent.denied", "execution.failed", "agent.offline", "policy.violation"] :
      event_type => length([
        for event in data.vienna_audit_log.recent_incidents.events :
        event if event.event_type == event_type
      ])
    }
    
    # Most recent critical events
    critical_events = [
      for event in data.vienna_audit_log.recent_incidents.events :
      event if event.severity == "critical"
    ]
  }
}

# vienna_policy_evaluation: Test policy evaluation
data "vienna_policy_evaluation" "test_migration" {
  # Test intent
  test_intent = {
    agent_id  = "agent_data_processor_prod"
    framework = "openclaw"
    action    = "database.migration"
    
    params = {
      migration_file  = "/migrations/v1.2.0_add_indexes.sql"
      target_version  = 120
      dry_run        = false
      backup_table   = true
    }
    
    # Context
    timestamp = timestamp()
    metadata = {
      priority = "high"
      team     = "data-engineering" 
    }
  }
  
  # Which policies to evaluate (optional - defaults to all active)
  policy_ids = [
    vienna_policy.business_hours_approval.id,
    vienna_policy.file_size_limit.id
  ]
}

# Show evaluation results
output "migration_policy_result" {
  value = {
    would_approve = data.vienna_policy_evaluation.test_migration.approved
    risk_tier    = data.vienna_policy_evaluation.test_migration.risk_tier
    
    # Triggered policies
    triggered_policies = data.vienna_policy_evaluation.test_migration.triggered_policies
    
    # Required actions
    required_actions = data.vienna_policy_evaluation.test_migration.required_actions
    
    # Explanation
    explanation = data.vienna_policy_evaluation.test_migration.explanation
  }
}

# vienna_usage_metrics: Get tenant usage statistics
data "vienna_usage_metrics" "current_month" {
  # Time period
  period = "month"
  start  = formatdate("YYYY-MM-01", timestamp())
  end    = timestamp()
  
  # Metric categories
  include_categories = [
    "intents",
    "executions", 
    "agents",
    "policies",
    "storage"
  ]
  
  # Breakdown options
  group_by = ["agent_id", "action_type"]
}

# Usage summary
output "usage_summary" {
  value = {
    # Current month usage
    intents_submitted = data.vienna_usage_metrics.current_month.metrics.intents.total
    executions_run    = data.vienna_usage_metrics.current_month.metrics.executions.total
    active_agents     = data.vienna_usage_metrics.current_month.metrics.agents.unique_count
    storage_gb        = data.vienna_usage_metrics.current_month.metrics.storage.total_gb
    
    # Plan limits
    plan_limits = data.vienna_usage_metrics.current_month.plan_limits
    
    # Usage by agent
    top_agents = data.vienna_usage_metrics.current_month.breakdown.by_agent_id
    
    # Usage by action type  
    by_action = data.vienna_usage_metrics.current_month.breakdown.by_action_type
    
    # Quota utilization
    quota_utilization = {
      intents = data.vienna_usage_metrics.current_month.metrics.intents.total / data.vienna_usage_metrics.current_month.plan_limits.max_intents_per_month
      agents  = data.vienna_usage_metrics.current_month.metrics.agents.unique_count / data.vienna_usage_metrics.current_month.plan_limits.max_agents
    }
  }
}

# ===== VARIABLES =====

variable "vienna_api_key" {
  description = "Vienna OS API key (vos_ prefixed)"
  type        = string
  sensitive   = true
}

variable "vienna_tenant_id" {
  description = "Vienna OS tenant ID"
  type        = string
  default     = null # Auto-detect from credentials
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for notifications"
  type        = string
  sensitive   = true
}

variable "smtp_username" {
  description = "SMTP username for email notifications"
  type        = string
  sensitive   = true
}

variable "smtp_password" {
  description = "SMTP password for email notifications" 
  type        = string
  sensitive   = true
}

variable "datadog_api_key" {
  description = "Datadog API key for metrics export"
  type        = string
  sensitive   = true
}

# ===== EXAMPLE OUTPUTS =====

# Fleet health check
output "fleet_health" {
  description = "Overall fleet health status"
  value = {
    healthy_percentage = (
      data.vienna_fleet_status.all_agents.healthy_count / 
      data.vienna_fleet_status.all_agents.total_count
    ) * 100
    
    status = (
      data.vienna_fleet_status.all_agents.healthy_count / 
      data.vienna_fleet_status.all_agents.total_count
    ) > 0.9 ? "healthy" : "degraded"
    
    last_updated = data.vienna_fleet_status.all_agents.last_updated
  }
}

# Policy compliance 
output "policy_compliance" {
  description = "Policy compliance metrics"
  value = {
    total_policies      = length(data.vienna_audit_log.recent_incidents.events)
    violations_24h      = length([
      for event in data.vienna_audit_log.recent_incidents.events :
      event if event.event_type == "policy.violation"
    ])
    compliance_rate_24h = 1 - (
      length([
        for event in data.vienna_audit_log.recent_incidents.events :
        event if event.event_type == "policy.violation"  
      ]) / max(1, data.vienna_usage_metrics.current_month.metrics.intents.total)
    )
  }
}

# Cost estimation
output "estimated_monthly_cost" {
  description = "Estimated monthly cost based on usage"
  value = {
    base_subscription = 99.00 # Business plan
    
    # Overage charges
    extra_intents = max(0, data.vienna_usage_metrics.current_month.metrics.intents.total - 10000) * 0.01
    extra_agents  = max(0, data.vienna_usage_metrics.current_month.metrics.agents.unique_count - 100) * 5.00
    
    # Storage costs 
    storage_cost = data.vienna_usage_metrics.current_month.metrics.storage.total_gb * 0.10
    
    # Total
    total_estimated = 99.00 + max(0, data.vienna_usage_metrics.current_month.metrics.intents.total - 10000) * 0.01 + max(0, data.vienna_usage_metrics.current_month.metrics.agents.unique_count - 100) * 5.00 + data.vienna_usage_metrics.current_month.metrics.storage.total_gb * 0.10
  }
}